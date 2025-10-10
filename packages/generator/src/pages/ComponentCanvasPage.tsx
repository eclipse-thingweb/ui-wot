import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  useReactFlow,
  NodeTypes,
  PanOnScrollMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppContext } from '../context/AppContext';
import { useNavbar } from '../context/NavbarContext';
import { useNavigate } from 'react-router-dom';
import { connectThings } from './canvas/connectThings';
import { NotificationOverlay, type OverlayNotification } from './canvas/NotificationOverlay';
import { connectEvent } from '@thingweb/ui-wot-components/services';
import { CardContent } from './canvas/CardContent';
import { SECTION_WIDTH, SECTION_HEIGHT, GAP, MIN_GAP, CARD_WIDTH, CARD_HEIGHT, getMinCardHeight, getCardDimensions } from './canvas/constants';
import { dashboardService } from '../services/dashboardService';
import { EditPopup } from '../components/EditPopup';
import { getAttributeSchema } from './canvas/attributeSchemas';
import { formatLabelText } from '../utils/label';
import { reflowAllSections, setGlobalLayoutOrder } from './canvas/layout';
import { createComponentResizeMouseDown, createSectionResizeMouseDown, setupComponentAutoFit } from './canvas/resize';

export function ComponentCanvasPage() {
  const { state, dispatch } = useAppContext();
  const { setContent, clear } = useNavbar();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const isDraggingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect?.width) setCanvasWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [membership, setMembership] = useState<Record<string, string | null>>({});
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);

  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [sectionStyles, setSectionStyles] = useState<Record<string, { bgColor: string; border: 'dashed' | 'solid' | 'none' }>>({});
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [layoutOrder, setLayoutOrder] = useState<Record<string, string[]>>({});

  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragHighlight, setDragHighlight] = useState<{ targetId: string; type: 'swap' | 'insert' } | null>(null);

  // Canvas display options
  const [showDots, setShowDots] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [zoomOnScroll, setZoomOnScroll] = useState(false);
  const [panOnScroll, setPanOnScroll] = useState(true);
  const [zoomOnDoubleClick, setZoomOnDoubleClick] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  // Notification overlay state
  const [overlayItems, setOverlayItems] = useState<OverlayNotification[]>([]);
  const overlayStopsRef = useRef<Array<() => void>>([]);
  const overlayNotifierKeyRef = useRef<string>('');
  const overlaySeqRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setGlobalLayoutOrder(layoutOrder);
  }, [layoutOrder]);

  useEffect(() => {
    const storageKey = `ui-wot-manual-positions-${window.location.pathname}`;
    localStorage.setItem(storageKey, JSON.stringify(manualPositions));
  }, [manualPositions]);

  // Restore layout either from imported dashboard layoutSnapshot (preferred) or local storage fallback
  useEffect(() => {
    if (state.layoutSnapshot) {
      const snap = state.layoutSnapshot;
      if (snap.membership) setMembership(snap.membership);
      if (snap.layoutOrder) setLayoutOrder(snap.layoutOrder);
      if (snap.sectionNames) setSectionNames(snap.sectionNames);
      if (snap.sectionStyles) setSectionStyles(snap.sectionStyles);
      if (snap.sizes) {
      }
      if (snap.manualPositions) setManualPositions(snap.manualPositions);
      // Clear snapshot to avoid reapplying on subsequent navigations
      setTimeout(() => dispatch({ type: 'SET_LAYOUT_SNAPSHOT', payload: undefined }), 0);
    } else {
      const storageKey = `ui-wot-manual-positions-${window.location.pathname}`;
      const savedPositions = localStorage.getItem(storageKey);
      if (savedPositions) {
        try {
          const positions = JSON.parse(savedPositions);
          setManualPositions(positions);
        } catch (e) {
          console.warn('Failed to load manual positions:', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to events that should be rendered via ui-notification
  useEffect(() => {
    // Cleanup any previous subscriptions
    overlayStopsRef.current.forEach(s => {
      try {
        s();
      } catch {}
    });
    overlayStopsRef.current = [];

    const notifiers = state.components.filter(c => c.type === 'event' && c.uiComponent === 'ui-notification');
    if (!notifiers.length) {
      if (overlayItems.length) setOverlayItems([]);
      overlayNotifierKeyRef.current = '';
      return;
    }

    // Reset overlay list when the set of notifiers changes
    const key = notifiers
      .map(n => n.id)
      .sort()
      .join('|');
    if (overlayNotifierKeyRef.current !== key) {
      overlayNotifierKeyRef.current = key;
      if (overlayItems.length) setOverlayItems([]);
    }

    // Small helpers for message/type
    const formatTime = (t: any) => {
      const ms = typeof t === 'number' ? t : t ? Date.parse(String(t)) : NaN;
      return Number.isFinite(ms) ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : undefined;
    };
    const summarize = (val: any): string => {
      if (val == null) return '';
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
      if (Array.isArray(val))
        return (
          val
            .slice(0, 3)
            .map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
            .join(', ') + (val.length > 3 ? ' …' : '')
        );
      const known = (val as any).message || (val as any).text || (val as any).description || (val as any).status;
      if (known && typeof known === 'string') return known;
      const entries = Object.entries(val as any)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .slice(0, 3)
        .join(', ');
      return entries || JSON.stringify(val);
    };
    const inferType = (comp: any, val: any): 'info' | 'success' | 'warning' | 'error' => {
      const explicit = comp?.attributes?.['type'] as string | undefined;
      if (explicit && ['info', 'success', 'warning', 'error'].includes(explicit)) return explicit as any;
      const level = (val && (val.level || val.severity || val.type || val.status))?.toString()?.toLowerCase?.();
      if (level?.includes?.('error') || level === 'fatal' || level === 'fail') return 'error';
      if (level?.includes?.('warn')) return 'warning';
      if (level === 'ok' || level === 'success' || level === 'passed') return 'success';
      return 'info';
    };

    const wireNotifier = async (component: any) => {
      const tdInfo = state.tdInfos.find(t => t.id === component.tdId);
      const baseUrl = (tdInfo?.source.type === 'url' ? (tdInfo.source.content as string) : undefined) || component.tdUrl || '';
      if (!baseUrl) return;
      await (customElements as any).whenDefined?.('ui-event');

      const eventEl = document.createElement('ui-event') as any;
      eventEl.setAttribute('td-url', baseUrl);
      eventEl.setAttribute('td-event', component.name);

      const stop = await connectEvent(eventEl, { baseUrl, name: component.name });
      overlayStopsRef.current.push(stop);

      const onEventReceived = (ev: any) => {
        const detail = ev?.detail;
        const payload = detail?.value ?? detail ?? ev;
        const title = (component.attributes?.['label'] as any) || component.name || 'Event';
        const isUiMsg = detail && typeof detail === 'object' && ('newVal' in detail || 'value' in detail || 'timestamp' in detail || 'ts' in detail);
        const value = isUiMsg ? ((detail as any).value ?? (detail as any).newVal) : payload;
        const timestamp = isUiMsg ? ((detail as any).ts ?? (detail as any).timestamp) : undefined;
        const message = (() => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          const timeStr = formatTime(timestamp);
          return timeStr ? `${title}: ${valueStr} • ${timeStr}` : `${title}: ${valueStr}`;
        })();

        const seq = (overlaySeqRef.current[component.id] = (overlaySeqRef.current[component.id] || 0) + 1);
        const id = `${component.id}-${Date.now()}-${seq}`;
        const type = inferType(component, payload);
        const duration = component.attributes?.['duration'] != null ? Number(component.attributes['duration']) : 3000;
        const showIcon = component.attributes?.['show-icon'] != null ? String(component.attributes['show-icon']) === 'true' : true;
        const showCloseButton = component.attributes?.['show-close-button'] != null ? String(component.attributes['show-close-button']) === 'true' : true;
        const dark = component.attributes?.['dark'] != null ? String(component.attributes['dark']) === 'true' : false;
        setOverlayItems(prev => [{ id, message: message || summarize(payload), type, duration, showIcon, showCloseButton, dark }, ...prev].slice(0, 6));
      };

      eventEl.addEventListener('eventReceived', onEventReceived);
      overlayStopsRef.current.push(() => eventEl.removeEventListener('eventReceived', onEventReceived));
      await eventEl.startListening?.();
    };

    for (const n of notifiers) void wireNotifier(n);

    return () => {
      overlayStopsRef.current.forEach(s => {
        try {
          s();
        } catch {}
      });
      overlayStopsRef.current = [];
    };
  }, [state.components, state.tdInfos]);

  // Preserve existing node positions/sizes on rebuild
  const nodesRef = useRef<Node[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const buildNodes = useMemo(() => {
    const thingOrder = state.tdInfos.map(thingInfo => thingInfo.id);
    const componentsBySection: Record<string, string[]> = {};
    state.components.forEach(component => {
      // Skip building cards for notifications
      if (component.type === 'event' && component.uiComponent === 'ui-notification') return;
      const sectionId = membership[component.id] ?? component.tdId ?? '__unassigned__';
      if (!componentsBySection[sectionId]) componentsBySection[sectionId] = [];
      componentsBySection[sectionId].push(component.id);
    });
    Object.keys(componentsBySection).forEach(sectionId => {
      const order = layoutOrder[sectionId] || [];
      componentsBySection[sectionId].sort((componentA, componentB) => {
        const indexA = order.indexOf(componentA);
        const indexB = order.indexOf(componentB);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    });

    const sectionIds = [...thingOrder];
    const activeSectionCount = sectionIds.filter(sectionId => (componentsBySection[sectionId] || []).length > 0).length;

    let columnCount, sectionWidth;
    if (activeSectionCount === 1) {
      columnCount = 1;
      sectionWidth = Math.min(canvasWidth - GAP * 2, 1800);
    } else if (activeSectionCount === 2) {
      columnCount = 2;
      const availableForSections = canvasWidth - GAP * 3;
      sectionWidth = Math.max(895, Math.floor(availableForSections / 2));
    } else {
      columnCount = 2;
      const availableForSections = canvasWidth - GAP * 3;
      sectionWidth = Math.max(900, Math.floor(availableForSections / 2));
    }

    const columnPositionsX = Array.from({ length: columnCount }, (_, i) => GAP + i * (sectionWidth + GAP));
    const columnHeights = Array.from({ length: columnCount }, () => GAP);
    const result: Node[] = [];

    for (const sectionId of sectionIds) {
      const componentIds = componentsBySection[sectionId] || [];
      if (componentIds.length === 0) continue;

      let columnIndex = 0;
      for (let i = 1; i < columnCount; i++) if (columnHeights[i] < columnHeights[columnIndex]) columnIndex = i;
      const positionX = columnPositionsX[columnIndex];
      const positionY = columnHeights[columnIndex];
      const sectionTitle =
        sectionId === '__unassigned__' ? 'Unassigned' : (sectionNames[sectionId] ?? state.tdInfos.find(thingInfo => thingInfo.id === sectionId)?.title ?? 'Section');
      const styleConfig = sectionStyles[sectionId] || { bgColor: 'transparent', border: 'dashed' as const };
      const borderStyle = styleConfig.border === 'none' ? 'none' : `1px ${styleConfig.border} #94a3b8`;
      const existingSection = nodesRef.current.find(nodeItem => nodeItem.id === `sec:${sectionId}`);
      const widthForSection = sectionWidth;
      const sectionNode: Node = {
        id: `sec:${sectionId}`,
        type: 'sectionNode',
        data: {
          title: sectionTitle,
          sectionId: sectionId,
          styles: { bgColor: styleConfig.bgColor, border: borderStyle },
          editMode,
          onRename: (id: string, name: string) => setSectionNames(prev => ({ ...prev, [id]: name })),
          onRemoveSection: (id: string) => {
            const componentsToRemove = state.components.filter(c => (membership[c.id] ?? c.tdId ?? '__unassigned__') === id);
            componentsToRemove.forEach(c => dispatch({ type: 'REMOVE_COMPONENT', payload: c.id }));
            setMembership(prev => {
              const updated = { ...prev } as Record<string, string | null>;
              componentsToRemove.forEach(c => delete updated[c.id]);
              return updated;
            });
            setLayoutOrder(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          },
          onOpenSettings: (id: string) => setEditSectionId(id),
        },
        position: existingSection?.position ?? { x: positionX, y: positionY },
        style: { width: widthForSection, height: (existingSection?.style?.height as number) ?? SECTION_HEIGHT, borderRadius: 8 },
        draggable: editMode,
        dragHandle: '.section-drag-handle',
      };
      result.push(sectionNode);

      const innerWidth = widthForSection - GAP * 2;
      const childrenStartIndex = result.length;
      const componentsQueue = [...componentIds];

      type SpaceRect = { x: number; y: number; w: number; h: number };
      const occupiedSpaces: SpaceRect[] = [];
      let currentBottomY = GAP;

      const findBestPosition = (w: number, h: number): { x: number; y: number } => {
        // Try to place at each y axis
        const stepY = GAP;
        const stepX = 4; // Fine horizontal positioning

        for (let y = GAP; y <= currentBottomY + h + GAP; y += stepY) {
          // For each y axis, try placing from left to right
          for (let x = GAP; x + w <= innerWidth; x += stepX) {
            const candidate = { x, y, w: w + GAP, h: h + GAP };
            // Check if this position conflicts with any occupied space
            const hasConflict = occupiedSpaces.some(
              occupied =>
                !(
                  candidate.x >= occupied.x + occupied.w ||
                  candidate.x + candidate.w <= occupied.x ||
                  candidate.y >= occupied.y + occupied.h ||
                  candidate.y + candidate.h <= occupied.y
                ),
            );
            if (!hasConflict) {
              return { x, y };
            }
          }
        }
        // If no space found in existing rows, start a new row
        return { x: GAP, y: currentBottomY };
      };

      // Add overlap detection to ensure no cards overlap
      const detectAndFixOverlaps = () => {
        const children = result.slice(childrenStartIndex);
        let fixed = false;

        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const a = children[i];
            const b = children[j];
            const aPos = a.position as { x: number; y: number };
            const bPos = b.position as { x: number; y: number };
            const aWidth = (a.style?.width as number) ?? CARD_WIDTH;
            const aHeight = (a.style?.height as number) ?? getMinCardHeight((a.data as any)?.comp);
            const bWidth = (b.style?.width as number) ?? CARD_WIDTH;
            const bHeight = (b.style?.height as number) ?? getMinCardHeight((b.data as any)?.comp);

            const overlap = !(
              aPos.x + aWidth + MIN_GAP <= bPos.x ||
              bPos.x + bWidth + MIN_GAP <= aPos.x ||
              aPos.y + aHeight + MIN_GAP <= bPos.y ||
              bPos.y + bHeight + MIN_GAP <= aPos.y
            );

            if (overlap) {
              const newPos = findBestPosition(bWidth, bHeight);
              b.position = { x: newPos.x, y: newPos.y } as any;
              occupiedSpaces.push({ x: newPos.x, y: newPos.y, w: bWidth + GAP, h: bHeight + GAP });
              currentBottomY = Math.max(currentBottomY, newPos.y + bHeight + GAP);
              fixed = true;
            }
          }
        }
        return fixed;
      };

      while (componentsQueue.length) {
        const componentId = componentsQueue.shift()!;
        const component = state.components.find(c => c.id === componentId);
        if (!component) continue;

        const existingChild = nodesRef.current.find(n => n.id === componentId);
        const dimensions = getCardDimensions(component);
        let cardWidth = (existingChild?.style?.width as number) ?? dimensions.w;
        let cardHeight = (existingChild?.style?.height as number) ?? dimensions.h;
        cardHeight = Math.max(cardHeight, getMinCardHeight(component));

        const manualPosition = manualPositions[componentId];
        const cardPosition = manualPosition ? { x: manualPosition.x, y: manualPosition.y } : findBestPosition(cardWidth, cardHeight);

        result.push({
          id: componentId,
          type: 'componentNode',
          parentNode: `sec:${sectionId}`,
          data: {
            comp: component,
            sectionId: sectionId,
            size: { w: cardWidth, h: cardHeight },
            tdInfos: state.tdInfos,
            editMode,
            onEdit: setEditComponentId,
            onRemove: (componentId: string) => dispatch({ type: 'REMOVE_COMPONENT', payload: componentId }),
            dragHighlight: dragHighlight?.targetId === componentId ? dragHighlight?.type : null,
          },
          position: { x: cardPosition.x, y: cardPosition.y } as any,
          style: { width: cardWidth, height: cardHeight },
          draggable: editMode,
        });

        occupiedSpaces.push({ x: cardPosition.x, y: cardPosition.y, w: cardWidth + GAP, h: cardHeight + GAP });
        currentBottomY = Math.max(currentBottomY, cardPosition.y + cardHeight + GAP);
      }

      // Fix any overlaps that occurred during placement
      let attempts = 0;
      while (detectAndFixOverlaps() && attempts < 3) {
        attempts++;
      }

      // adjust section height to enclose children
      const children = result.slice(childrenStartIndex);
      let maxBottom = GAP;
      if (children.length) {
        for (const ch of children) {
          const h = (ch.style?.height as number) ?? getMinCardHeight((ch.data as any)?.comp);
          const y = (ch.position?.y as number) ?? 0;
          maxBottom = Math.max(maxBottom, y + h + GAP);
        }
      } else {
        maxBottom = SECTION_HEIGHT;
      }
      sectionNode.style = { ...sectionNode.style, height: Math.max(SECTION_HEIGHT, maxBottom) } as any;
      // stack using the section's current or computed height
      const sectionHeight = (existingSection?.style?.height as number) ?? (Number((sectionNode.style as any)?.height) || SECTION_HEIGHT);
      const SECTION_VERTICAL_GAP = GAP + 40;
      columnHeights[columnIndex] = Math.max(columnHeights[columnIndex], positionY + sectionHeight + SECTION_VERTICAL_GAP);
    }

    // Fallback: components without any section create standalone nodes so page never blanks
    const unassignedComponents = componentsBySection['__unassigned__'] || [];
    for (const componentId of unassignedComponents) {
      if (result.find(nodeItem => nodeItem.id === componentId)) continue;
      const component = state.components.find(componentItem => componentItem.id === componentId);
      if (!component) continue;
      const existingFreeNode = nodesRef.current.find(nodeItem => nodeItem.id === componentId && !nodeItem.parentNode);
      const dimensions = getCardDimensions(component);
      const cardWidth = (existingFreeNode?.style?.width as number) ?? dimensions.w;
      const cardHeight = (existingFreeNode?.style?.height as number) ?? dimensions.h;
      const nodePosition = existingFreeNode?.position ?? { x: 0, y: columnHeights[0] + GAP };
      result.push({
        id: componentId,
        type: 'componentNode',
        data: {
          comp: component,
          sectionId: null,
          size: { w: cardWidth, h: cardHeight },
          tdInfos: state.tdInfos,
          editMode,
          onEdit: setEditComponentId,
          onRemove: (componentIdToRemove: string) => dispatch({ type: 'REMOVE_COMPONENT', payload: componentIdToRemove }),
        },
        position: nodePosition as any,
        style: { width: cardWidth, height: cardHeight },
        draggable: editMode,
      });
    }

    return result;
  }, [state.components, state.tdInfos, membership, editMode, dispatch, sectionNames, sectionStyles, layoutOrder, canvasWidth, manualPositions]);

  useEffect(() => {
    setNodes(buildNodes);
  }, [buildNodes, setNodes]);

  // Auto-reflow after nodes are built (regardless of edit mode)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      // Don't reflow if user is currently dragging
      if (!isDraggingRef.current) {
        setNodes(prev => reflowAllSections(prev));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes.length, setNodes]);

  // Live reflow when components change (for live editing feedback)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      // Don't reflow if user is currently dragging
      if (!isDraggingRef.current) {
        setNodes(prev => reflowAllSections(prev));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [state.components, setNodes]);

  // Initialize layout order from current arrangement once nodes are first built
  useEffect(() => {
    if (!nodes.length) return;
    const componentsBySection: Record<string, string[]> = {};
    nodes.forEach(nodeItem => {
      if (nodeItem.type === 'componentNode' && nodeItem.parentNode) {
        const sectionId = (nodeItem.parentNode as string).replace(/^sec:/, '');
        if (!componentsBySection[sectionId]) componentsBySection[sectionId] = [];
        componentsBySection[sectionId].push(nodeItem.id);
      }
    });
    if (Object.keys(componentsBySection).length) {
      setLayoutOrder(previousOrder => {
        const updatedOrder = { ...previousOrder };
        Object.entries(componentsBySection).forEach(([sectionId, componentIds]) => (updatedOrder[sectionId] = componentIds));
        setGlobalLayoutOrder(updatedOrder);
        return updatedOrder;
      });
    }
  }, [nodes.length]);

  // Initialize membership for new components
  useEffect(() => {
    setMembership(previousMembership => {
      let hasChanged = false;
      const updatedMembership: Record<string, string | null> = { ...previousMembership };
      state.components.forEach(component => {
        if (updatedMembership[component.id] === undefined) {
          updatedMembership[component.id] = component.tdId ?? null;
          hasChanged = true;
        }
      });
      // cleanup
      Object.keys(updatedMembership).forEach(componentId => {
        if (!state.components.find(component => component.id === componentId)) {
          delete updatedMembership[componentId];
          hasChanged = true;
        }
      });
      return hasChanged ? updatedMembership : previousMembership;
    });
    // Keep layoutOrder in sync with components per section
    setLayoutOrder(previousOrder => {
      const componentsBySection: Record<string, string[]> = {};
      state.components.forEach(component => {
        const sectionId = membership[component.id] ?? component.tdId ?? '__unassigned__';
        if (!componentsBySection[sectionId]) componentsBySection[sectionId] = [];
        componentsBySection[sectionId].push(component.id);
      });
      const updatedOrder: Record<string, string[]> = { ...previousOrder };
      Object.entries(componentsBySection).forEach(([sectionId, componentIds]) => {
        const existingComponents = (previousOrder[sectionId] || []).filter(componentId => componentIds.includes(componentId));
        const newComponents = componentIds.filter(componentId => !existingComponents.includes(componentId));
        updatedOrder[sectionId] = [...existingComponents, ...newComponents];
      });
      setGlobalLayoutOrder(updatedOrder);
      return updatedOrder;
    });
  }, [state.components, membership]);

  const dashboardSummary = useMemo(() => {
    const thingDescriptionCount = state.tdInfos.length;
    const componentCount = state.components.length;
    const thingDescriptionText = thingDescriptionCount > 0 ? `${thingDescriptionCount} TD${thingDescriptionCount > 1 ? 's' : ''} loaded` : 'No TD loaded';
    return `DASHBOARD – ${thingDescriptionText}, ${componentCount} components`;
  }, [state.tdInfos.length, state.components.length]);

  useEffect(() => {
    setContent({
      info: <span>{dashboardSummary}</span>,
      actions: (
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-2 border rounded-lg px-2 py-1 cursor-pointer select-none transition-colors"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
            <span className="text-xs font-heading">Edit</span>
          </label>

          <button onClick={() => navigate('/td-input')} className="bg-accent hover:bg-accent-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors">
            Add TD
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'RESET_STATE' });
              navigate('/');
            }}
            className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors"
          >
            New
          </button>
          <button
            onClick={() => {
              try {
                const name = prompt('Save dashboard as (name):', state.tdInfos[0]?.title || 'dashboard')?.trim();
                if (!name) return;
                // Build a React Flow layout snapshot for persistence
                const sizes: Record<string, { w: number; h: number }> = {};
                nodesRef.current.forEach(n => {
                  if (n.type === 'componentNode') {
                    const w = (n.style?.width as number) ?? CARD_WIDTH;
                    const h = (n.style?.height as number) ?? CARD_HEIGHT;
                    sizes[n.id] = { w, h };
                  }
                });
                const layoutSnapshot = {
                  manualPositions,
                  sizes,
                  membership,
                  layoutOrder,
                  sectionNames,
                  sectionStyles,
                } as any;
                // Attach snapshot to state for saving/export
                dispatch({ type: 'SET_LAYOUT_SNAPSHOT', payload: layoutSnapshot });
                const stateWithLayout = { ...state, layoutSnapshot } as any;
                dashboardService.saveDashboard(stateWithLayout, name);
                dashboardService.exportFromState(stateWithLayout, { name });
                alert('Dashboard saved and downloaded as JSON.');
              } catch {}
            }}
            className="bg-primary hover:bg-primary-light text-white font-heading font-medium py-1.5 px-3 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      ),
    });
    return () => clear();
  }, [setContent, clear, navigate, editMode, dashboardSummary, state, dispatch]);

  // Toggle node draggability based on edit mode
  useEffect(() => {
    setNodes(prev => prev.map(n => ({ ...n, draggable: editMode })));
  }, [editMode, setNodes]);

  connectThings({ tdInfos: state.tdInfos, components: state.components, editMode });

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      sectionNode: SectionNode,
      componentNode: ComponentNode,
    }),
    [],
  );

  const onConnect = (connection: Connection) => setEdges((currentEdges: Edge[]) => addEdge(connection, currentEdges));

  // Context menu handlers
  const onPaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      show: true,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(previousMenu => ({ ...previousMenu, show: false }));
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.show]);

  // Drag preview state
  const dragRef = useRef<{
    activeId: string | null;
    baseline: Node[];
  } | null>(null);

  const onNodeDragStart = (_: any, draggedNode: any) => {
    if (!editMode) return;
    if (!draggedNode || draggedNode.type !== 'componentNode') return;
    isDraggingRef.current = true;
    dragRef.current = { activeId: draggedNode.id, baseline: nodes.map(nodeItem => ({ ...nodeItem, position: { ...nodeItem.position } })) };
  };

  const onNodeDrag = (_: any, draggedNode: any) => {
    // Allow free dragging in edit mode
    if (!editMode || !draggedNode || draggedNode.type !== 'componentNode') return;

    // Update positions in real-time during drag to show live arrangement
    const draggingCardId = draggedNode.id;
    const draggingPosition = draggedNode.position;

    // Find the section of the card being dragged
    const parentSectionId = draggedNode.parentNode;
    if (!parentSectionId) return;

    // Get all cards in the same section
    const sectionCards = nodes.filter(nodeItem => nodeItem.parentNode === parentSectionId && nodeItem.type === 'componentNode' && nodeItem.id !== draggingCardId);

    // Apply coordinate-based repositioning for cards that would overlap
    const cardWidth = (draggedNode.style?.width as number) ?? CARD_WIDTH;
    const cardHeight = (draggedNode.style?.height as number) ?? getMinCardHeight(draggedNode.data?.comp);
    const sectionNode = nodes.find(nodeItem => nodeItem.id === parentSectionId);
    const sectionWidth = (sectionNode?.style?.width as number) ?? SECTION_WIDTH;
    const innerWidth = sectionWidth - GAP * 2;

    // Track occupied spaces excluding the dragging card
    const occupiedSpaces: Array<{ x: number; y: number; w: number; h: number; id: string }> = [];

    // Add the dragging card's new position
    occupiedSpaces.push({
      x: draggingPosition.x,
      y: draggingPosition.y,
      w: cardWidth + GAP,
      h: cardHeight + GAP,
      id: draggingCardId,
    });

    let swapTarget: string | null = null;
    const dragCenter = { x: draggingPosition.x + cardWidth / 2, y: draggingPosition.y + cardHeight / 2 };

    sectionCards.forEach(card => {
      const pos = card.position;
      const cardWidth = (card.style?.width as number) ?? CARD_WIDTH;
      const cardHeight = (card.style?.height as number) ?? getMinCardHeight((card as any)?.data?.comp);

      if (dragCenter.x >= pos.x && dragCenter.x <= pos.x + cardWidth && dragCenter.y >= pos.y && dragCenter.y <= pos.y + cardHeight) {
        swapTarget = card.id;
      }
    });

    // Update drag highlight for visual feedback
    if (swapTarget && swapTarget !== dragHighlight?.targetId) {
      setDragHighlight({ targetId: swapTarget, type: 'swap' });
    } else if (!swapTarget && dragHighlight) {
      setDragHighlight(null);
    }

    const findBestPosition = (w: number, h: number, excludeId: string): { x: number; y: number } => {
      const stepY = GAP;
      const stepX = 4;
      let maxBottom = GAP;

      // Calculate max bottom from current occupancy
      occupiedSpaces.forEach(space => {
        if (space.id !== excludeId) {
          maxBottom = Math.max(maxBottom, space.y + space.h);
        }
      });

      for (let y = GAP; y <= maxBottom + GAP; y += stepY) {
        for (let x = GAP; x + w <= innerWidth; x += stepX) {
          const hasConflict = occupiedSpaces.some(
            occupied => occupied.id !== excludeId && !(x >= occupied.x + occupied.w || x + w + GAP <= occupied.x || y >= occupied.y + occupied.h || y + h + GAP <= occupied.y),
          );
          if (!hasConflict) return { x, y };
        }
      }
      return { x: GAP, y: maxBottom };
    };

    // Handle card swapping or displacement
    const updatedNodes = [...nodes];
    let needsUpdate = false;

    if (swapTarget) {
      // Swap positions with the target card
      const targetNode = sectionCards.find(card => card.id === swapTarget);
      if (targetNode) {
        const targetIndex = updatedNodes.findIndex(n => n.id === swapTarget);
        const dragIndex = updatedNodes.findIndex(n => n.id === draggingCardId);

        if (targetIndex >= 0 && dragIndex >= 0) {
          // Store the target's original position for the dragging card to take
          const targetOriginalPos = { ...targetNode.position };

          // Move target to dragging card's original position (from dragRef baseline)
          const dragOriginalPos = dragRef.current?.baseline.find(n => n.id === draggingCardId)?.position;
          if (dragOriginalPos) {
            updatedNodes[targetIndex] = {
              ...updatedNodes[targetIndex],
              position: { ...dragOriginalPos },
            };

            // Update manual positions to remember the swap
            setManualPositions(prev => ({
              ...prev,
              [swapTarget!]: { ...dragOriginalPos },
              [draggingCardId]: { ...targetOriginalPos },
            }));

            needsUpdate = true;
          }
        }
      }
    } else {
      // Regular displacement behavior
      sectionCards.forEach(card => {
        const pos = card.position;
        const cardWidth = (card.style?.width as number) ?? CARD_WIDTH;
        const cardHeight = (card.style?.height as number) ?? getMinCardHeight((card as any)?.data?.comp);

        // Check if this card overlaps with the dragging card's new position
        const hasOverlap = !(
          pos.x + cardWidth + MIN_GAP <= draggingPosition.x ||
          draggingPosition.x + cardWidth + MIN_GAP <= pos.x ||
          pos.y + cardHeight + MIN_GAP <= draggingPosition.y ||
          draggingPosition.y + cardHeight + MIN_GAP <= pos.y
        );

        if (hasOverlap) {
          const newPosition = findBestPosition(cardWidth, cardHeight, card.id);
          const nodeIndex = updatedNodes.findIndex(nodeItem => nodeItem.id === card.id);
          if (nodeIndex >= 0) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              position: { x: newPosition.x, y: newPosition.y },
            };
            occupiedSpaces.push({
              x: newPosition.x,
              y: newPosition.y,
              w: cardWidth + GAP,
              h: cardHeight + GAP,
              id: card.id,
            });
            needsUpdate = true;
          }
        } else {
          occupiedSpaces.push({
            x: pos.x,
            y: pos.y,
            w: cardWidth + GAP,
            h: cardHeight + GAP,
            id: card.id,
          });
        }
      });
    }

    if (needsUpdate) {
      setNodes(updatedNodes);
    }
  };

  const onNodeDragStop = (_: any, draggedNode: any) => {
    // After drag, clean up and persist the position changes
    if (!editMode || !draggedNode || draggedNode.type !== 'componentNode') return;

    // Clear drag highlight
    setDragHighlight(null);

    // Mark that we're no longer dragging
    isDraggingRef.current = false;

    // Store final position in manual positions for persistence
    setManualPositions(previousPositions => ({
      ...previousPositions,
      [draggedNode.id]: { x: draggedNode.position.x, y: draggedNode.position.y },
    }));

    // Clean up drag reference
    dragRef.current = null;

    // Update layout order based on final positions to maintain consistency
    const parentSectionId = draggedNode.parentNode;
    if (parentSectionId) {
      const sectionCards = nodes.filter(nodeItem => nodeItem.parentNode === parentSectionId && nodeItem.type === 'componentNode');
      // Sort cards by their Y position, then X position
      const sortedCards = sectionCards.sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 10) {
          return a.position.x - b.position.x; // Same row, sort by X
        }
        return a.position.y - b.position.y; // Different rows, sort by Y
      });

      const newOrder = sortedCards.map(card => (card as any).data?.comp?.id).filter(Boolean);
      setLayoutOrder(previousOrder => ({
        ...previousOrder,
        [parentSectionId.replace('sec:', '')]: newOrder,
      }));
    }

    // Trigger a gentle reflow after a delay to clean up any minor positioning issues
    setTimeout(() => {
      if (!isDraggingRef.current) {
        // Only fix overlaps without completely rearranging the layout
        setNodes(previousNodes => {
          const updatedNodes = [...previousNodes];
          const sectionNodes = updatedNodes.filter(nodeItem => nodeItem.type === 'sectionNode');

          sectionNodes.forEach(sectionNode => {
            const childrenNodes = updatedNodes.filter(nodeItem => nodeItem.parentNode === sectionNode.id && nodeItem.type === 'componentNode');
            if (childrenNodes.length === 0) return;

            // Only fix clear overlaps without major repositioning
            for (let i = 0; i < childrenNodes.length; i++) {
              for (let j = i + 1; j < childrenNodes.length; j++) {
                const firstNode = childrenNodes[i];
                const secondNode = childrenNodes[j];
                const firstPosition = firstNode.position as { x: number; y: number };
                const secondPosition = secondNode.position as { x: number; y: number };
                const firstWidth = (firstNode.style?.width as number) ?? CARD_WIDTH;
                const firstHeight = (firstNode.style?.height as number) ?? CARD_HEIGHT;
                const secondWidth = (secondNode.style?.width as number) ?? CARD_WIDTH;
                const secondHeight = (secondNode.style?.height as number) ?? CARD_HEIGHT;

                const hasOverlap = !(
                  firstPosition.x + firstWidth + MIN_GAP <= secondPosition.x ||
                  secondPosition.x + secondWidth + MIN_GAP <= firstPosition.x ||
                  firstPosition.y + firstHeight + MIN_GAP <= secondPosition.y ||
                  secondPosition.y + secondHeight + MIN_GAP <= firstPosition.y
                );

                if (hasOverlap) {
                  const sectionWidth = (sectionNode.style?.width as number) ?? SECTION_WIDTH;
                  const innerWidth = sectionWidth - GAP * 2;

                  if (firstPosition.x + firstWidth + MIN_GAP + secondWidth <= innerWidth) {
                    secondNode.position = { x: firstPosition.x + firstWidth + MIN_GAP, y: secondPosition.y } as any;
                  } else {
                    secondNode.position = { x: secondPosition.x, y: firstPosition.y + firstHeight + MIN_GAP } as any;
                  }
                }
              }
            }
          });

          return updatedNodes;
        });
      }
    }, 300);
  };

  return (
    <div ref={wrapperRef} className="canvas-page" style={{ position: 'relative', width: '100%', height: 'calc(100vh - var(--navbar-height))' }}>
      {/* Notification (top-center, below navbar) */}
      {overlayItems.length > 0 && <NotificationOverlay items={overlayItems} onClose={id => setOverlayItems(prev => prev.filter(i => i.id !== id))} />}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        fitViewOptions={{
          padding: 0.05,
          minZoom: 0.5,
          maxZoom: 1.2,
          includeHiddenNodes: false,
          nodes: nodes.filter(n => n.type === 'sectionNode').slice(0, 1), // Focus on first section only
        }}
        zoomOnScroll={zoomOnScroll}
        panOnScroll={panOnScroll}
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnDoubleClick={zoomOnDoubleClick}
      >
        {showMiniMap && (
          <MiniMap
            nodeColor={node => {
              if (node.type === 'sectionNode') {
                return 'var(--color-border)';
              }
              return 'var(--color-primary)';
            }}
            maskColor="var(--color-bg-secondary)"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          />
        )}
        {showControls && (
          <Controls
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          />
        )}
        {showDots && <Background variant={BackgroundVariant.Dots} gap={16} size={1} />}
        {showGrid && <Background variant={BackgroundVariant.Lines} gap={20} size={1} />}
      </ReactFlow>

      {/* Canvas Right Click Menu */}
      {contextMenu.show && (
        <div
          className="fixed rounded-lg shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            minWidth: '200px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs font-semibold border-b" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
            Canvas Options
          </div>

          {/* Background Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowDots(!showDots);
              setShowGrid(false);
              closeContextMenu();
            }}
          >
            <span>Show Dots</span>
            {showDots && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowGrid(!showGrid);
              setShowDots(false);
              closeContextMenu();
            }}
          >
            <span>Show Grid</span>
            {showGrid && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowDots(false);
              setShowGrid(false);
              closeContextMenu();
            }}
          >
            <span>Hide Background</span>
            {!showDots && !showGrid && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* UI Elements */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowMiniMap(!showMiniMap);
              closeContextMenu();
            }}
          >
            <span>Show Mini Map</span>
            {showMiniMap && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setShowControls(!showControls);
              closeContextMenu();
            }}
          >
            <span>Show Controls</span>
            {showControls && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* Interaction Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setZoomOnScroll(true);
              setPanOnScroll(false);
              closeContextMenu();
            }}
          >
            <span>Zoom on Scroll</span>
            {zoomOnScroll && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setPanOnScroll(true);
              setZoomOnScroll(false);
              closeContextMenu();
            }}
          >
            <span>Pan on Scroll</span>
            {panOnScroll && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <button
            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              setZoomOnDoubleClick(!zoomOnDoubleClick);
              closeContextMenu();
            }}
          >
            <span>Double-click Zoom</span>
            {zoomOnDoubleClick && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>

          {/* Layout Options */}
          <button
            className="w-full px-3 py-2 text-left text-sm transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              if (confirm('Reset all manual card positions to auto-layout?')) {
                setManualPositions({});
                const key = `ui-wot-manual-positions-${window.location.pathname}`;
                localStorage.removeItem(key);
              }
              closeContextMenu();
            }}
          >
            <span>Reset Layout</span>
          </button>
        </div>
      )}

      {/* Card Edit Popup */}
      {editComponentId &&
        (() => {
          const comp = state.components.find(c => c.id === editComponentId);
          if (!comp) return null;
          const affordance = state.availableAffordances.find(a => a.key === comp.affordanceKey);
          const schema = getAttributeSchema(comp.uiComponent);
          const attributesList = Object.keys(schema);
          const attributesTypes = schema;
          const attributesValues: Record<string, string> = {} as any;
          attributesList.forEach(k => {
            const raw = comp.attributes?.[k];
            if (raw == null) attributesValues[k] = schema[k].type === 'boolean' ? 'false' : '';
            else attributesValues[k] = String(raw);
          });
          return (
            <EditPopup
              mode="component"
              component={comp}
              affordance={affordance}
              onClose={() => setEditComponentId(null)}
              attributesList={attributesList}
              attributesValues={attributesValues}
              attributesTypes={attributesTypes}
              onAttributeChange={(componentId, attributeName, attributeValue) => {
                const targetComponent = state.components.find(component => component.id === componentId);
                if (!targetComponent) return;
                const updatedAttributes = { ...(targetComponent.attributes || {}) } as Record<string, string>;
                if (attributeValue === '' || attributeValue == null) delete updatedAttributes[attributeName];
                else updatedAttributes[attributeName] = attributeValue;
                dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { attributes: updatedAttributes } } });
                const hostElement = document.querySelector(`[data-component-id="${componentId}"]`);
                const componentElement = hostElement?.querySelector(targetComponent.uiComponent) as HTMLElement | null;
                if (componentElement) {
                  const applyValue = (name: string, value: string | null | undefined) => {
                    if (value === '' || value == null) componentElement.removeAttribute(name);
                    else componentElement.setAttribute(name, value);
                  };
                  let finalValue = attributeValue as string | undefined;
                  if (attributeName === 'label') finalValue = formatLabelText(attributeValue, { maxPerLine: 24, maxLines: 2 });
                  applyValue(attributeName, finalValue);
                }
              }}
              onVariantChange={(componentId, variant) => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: componentId, updates: { variant } } })}
              onComponentClose={componentId => dispatch({ type: 'REMOVE_COMPONENT', payload: componentId })}
            />
          );
        })()}

      {/* Section Settings Popup */}
      {editSectionId &&
        (() => {
          const currentSectionId = editSectionId!;
          const sectionName = sectionNames[currentSectionId] ?? state.tdInfos.find(thingInfo => thingInfo.id === currentSectionId)?.title ?? 'Section';
          const sectionStyle = sectionStyles[currentSectionId] || { bgColor: 'transparent', border: 'dashed' as const };
          const handleSectionChange = (sectionId: string, updates: { name?: string; styles?: { bgColor?: string; border?: 'dashed' | 'solid' | 'none' } }) => {
            if (updates.name !== undefined) setSectionNames(previousNames => ({ ...previousNames, [sectionId]: updates.name! }));
            if (updates.styles)
              setSectionStyles(previousStyles => ({
                ...previousStyles,
                [sectionId]: { ...(previousStyles[sectionId] || { bgColor: 'transparent', border: 'dashed' as const }), ...updates.styles },
              }));
          };
          const onBulkAction = (id: string, action: 'hideWrappers' | 'showWrappers' | 'setVariant', payload?: { variant?: string }) => {
            const nodeSectionId = `sec:${id}`;
            const ids = nodes.filter(n => n.type === 'componentNode' && n.parentNode === nodeSectionId).map(n => n.id);
            if (action === 'hideWrappers') ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { hideCard: true } } }));
            else if (action === 'showWrappers') ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { hideCard: false } } }));
            else if (action === 'setVariant' && payload?.variant)
              ids.forEach(cid => dispatch({ type: 'UPDATE_COMPONENT', payload: { id: cid, updates: { variant: payload.variant } } }));
          };
          return (
            <EditPopup
              mode="section"
              sectionId={currentSectionId}
              sectionName={sectionName}
              sectionStyles={sectionStyle}
              onClose={() => setEditSectionId(null)}
              onSectionChange={handleSectionChange}
              onBulkAction={onBulkAction}
            />
          );
        })()}
    </div>
  );
}

function SectionNode({ id, data }: any) {
  const reactFlowInstance = useReactFlow();
  const resizingState = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const onMouseDown = createSectionResizeMouseDown(reactFlowInstance, id, resizingState);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: data?.styles?.bgColor || 'transparent',
        border: data?.styles?.border || `1px dashed var(--color-border)`,
        borderRadius: 8,
        position: 'relative',
      }}
    >
      {/* Section label */}
      <div style={{ position: 'absolute', left: GAP, top: -30, display: 'flex', alignItems: 'center', gap: 6, zIndex: 3 }}>
        <span
          className={`px-3 py-1 text-base font-heading font-semibold rounded shadow border ${data?.editMode ? 'section-drag-handle cursor-move' : 'nodrag nopan'}`}
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          {data?.title || 'Section'}
        </span>
        {data?.editMode && (
          <>
            <span
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Rename section"
              onClick={() => {
                const name = prompt('Rename section:', data?.title || '')?.trim();
                if (name) data?.onRename?.(data?.sectionId, name);
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </span>
            <span
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Section settings"
              onClick={() => data?.onOpenSettings?.(data?.sectionId)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35.74-.18 1.28-.72 1.46-1.46.94-1.543 3.11-1.543 4.05 0 .18.74.72 1.28 1.46 1.46z"
                />
              </svg>
            </span>
            <span
              className="nodrag nopan inline-flex items-center justify-center w-5 h-5 rounded cursor-pointer"
              title="Delete section"
              onClick={() => {
                if (confirm('Delete this section and its components?')) data?.onRemoveSection?.(data?.sectionId);
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </>
        )}
      </div>
      {/* Resize handle */}
      {data?.editMode && (
        <div
          className="nodrag nopan"
          onMouseDown={onMouseDown}
          style={{
            position: 'absolute',
            right: -6,
            bottom: -6,
            width: 14,
            height: 14,
            borderRadius: 4,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            cursor: 'nwse-resize',
          }}
        />
      )}
    </div>
  );
}

function ComponentNode({ id, data }: any) {
  const reactFlowInstance = useReactFlow();
  const resizingState = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const cardSize = data?.size || { w: CARD_WIDTH, h: CARD_HEIGHT };
  useEffect(() => {
    if (!data?.comp?.id) return;
    return setupComponentAutoFit(reactFlowInstance, id, data.comp, cardSize);
  }, [id, reactFlowInstance, data?.comp?.id]);
  const onMouseDown = createComponentResizeMouseDown(reactFlowInstance, id, data, resizingState);
  const hideWrapper = !!data?.comp?.hideCard;
  const isDragTarget = data?.dragHighlight === 'swap';

  return (
    <div
      className={hideWrapper ? 'relative w-full h-full' : 'rounded-lg shadow-sm border w-full h-full'}
      style={
        hideWrapper
          ? { position: 'relative', background: 'transparent', overflow: 'visible' }
          : {
              borderColor: isDragTarget ? '#3b82f6' : 'var(--color-border)',
              background: isDragTarget ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg-card)',
              position: 'relative',
              overflow: 'visible',
              boxShadow: isDragTarget ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : undefined,
              transform: isDragTarget ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }
      }
    >
      {/* A transparent overlay in edit mode to help drag anywhere */}
      {data?.editMode && <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
      {data?.editMode && (
        <div className="absolute top-1 right-1 flex items-center gap-2 z-10">
          <span
            className="nodrag nopan inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
            title="Edit"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              data?.onEdit?.(data?.comp?.id);
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </span>
          <span
            className="nodrag nopan inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer"
            title="Remove"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (data?.comp?.id) data?.onRemove?.(data.comp.id);
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
      )}
      {data?.editMode && (
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 12,
            height: 12,
            border: '1px solid #64748b',
            background: 'white',
            borderRadius: 3,
            cursor: 'nwse-resize',
            zIndex: 2,
          }}
          onMouseDown={onMouseDown}
        />
      )}
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 8,
          boxSizing: 'border-box',
          // Add scroll for object components when overflows
          overflow: data?.comp?.uiComponent?.toLowerCase().includes('object') || data?.comp?.affordanceKey?.includes('object') ? 'auto' : 'visible',
        }}
        data-component-id={data?.comp?.id}
      >
        {data?.comp ? <CardContent component={data.comp} tdInfos={data.tdInfos} /> : null}
      </div>
    </div>
  );
}
