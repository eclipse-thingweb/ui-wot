import { useEffect, useRef } from 'react';
import { initializeWot, connectAll } from '@thingweb/ui-wot-components/services';

export function connectThings(deps: { tdInfos: any[]; components: any[]; editMode: boolean }) {
  const stopHandles = useRef<Array<() => void>>([]);
  const seqRef = useRef(0);

  const disconnectAll = () => {
    if (!stopHandles.current?.length) return;
    for (const stop of stopHandles.current) {
      try {
        stop();
      } catch (e) {}
    }
    stopHandles.current = [];
  };

  useEffect(() => {
    const canvasRoot = document.querySelector('.canvas-page') as HTMLElement | null;
    if (!canvasRoot) return;

    // If editing, disconnect and skip wiring
    if (deps.editMode) {
      disconnectAll();
      return;
    }

    const seq = ++seqRef.current;
    let cancelled = false;

    const wire = async () => {
      try {
        // Give the DOM one frame to settle after render
        await new Promise<void>(r => requestAnimationFrame(() => r()));
        if (cancelled || seqRef.current !== seq) return;

        // Collect UI elements (ui-*) or pre-wired selectors; attempt few times in case shadow DOM loads late
        const propertySelector = '[td-property]';
        const actionSelector = '[td-action]';
        const eventSelector = '[td-event]';
        let uiNodes: HTMLElement[] = [];
        for (let i = 0; i < 10; i++) {
          const allNodes = Array.from(canvasRoot.querySelectorAll('*')) as HTMLElement[];
          uiNodes = allNodes.filter(n => n.tagName.toLowerCase().startsWith('ui-')) as HTMLElement[];
          const wiredCount =
            canvasRoot.querySelectorAll(propertySelector).length + canvasRoot.querySelectorAll(actionSelector).length + canvasRoot.querySelectorAll(eventSelector).length;
          if (uiNodes.length > 0 || wiredCount > 0) break;
          await new Promise(r => setTimeout(r, 100));
        }
        if (cancelled || seqRef.current !== seq) return;

        // Ensure custom elements are defined
        const tagSet = Array.from(new Set(uiNodes.map(n => n.tagName.toLowerCase())));
        const tagsToLoad = tagSet.length
          ? tagSet
          : [
              'ui-button',
              'ui-toggle',
              'ui-slider',
              'ui-text',
              'ui-number-picker',
              'ui-calendar',
              'ui-checkbox',
              'ui-color-picker',
              'ui-file-picker',
              'ui-event',
              'ui-notification',
              'ui-object',
            ];
        await Promise.all(tagsToLoad.map(t => ((window as any).customElements?.whenDefined ? customElements.whenDefined(t) : Promise.resolve())));
        if (cancelled || seqRef.current !== seq) return;

        // Wait for the components to load
        await Promise.all(
          uiNodes.map(async n => {
            const uiEl: any = n as any;
            if (typeof uiEl.componentOnReady === 'function') {
              try {
                await uiEl.componentOnReady();
              } catch {}
            }
          }),
        );
        if (cancelled || seqRef.current !== seq) return;

        try {
          await initializeWot();
        } catch {}
        if (cancelled || seqRef.current !== seq) return;

        // Resolve base URL
        const tdUrls = deps.tdInfos.map(t => (t.source?.type === 'url' ? (t.source.content as string) : null)).filter(Boolean) as string[];
        const attrUrl = (canvasRoot.querySelector('[td-url]') as HTMLElement | null)?.getAttribute('td-url') || undefined;
        const slug = (deps.tdInfos[0]?.title || 'thing')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .trim();
        const baseUrl = tdUrls[0] ?? attrUrl ?? `http://localhost:8089/${slug}`;

        // Ensure td-url on all wired elements
        const wiredEls = Array.from(canvasRoot.querySelectorAll<HTMLElement>('[td-property],[td-action],[td-event]'));
        if (baseUrl) {
          for (const el of wiredEls) {
            if (!el.getAttribute('td-url')) el.setAttribute('td-url', baseUrl);
          }
        } else {
          const missing = wiredEls.filter(el => !el.getAttribute('td-url')).length;
          if (missing > 0) return;
        }
        if (cancelled || seqRef.current !== seq) return;

        // Reset previous connections
        disconnectAll();
        if (cancelled || deps.editMode || seqRef.current !== seq) return;

        // Connect within canvas, then fall back to document if nothing wires up
        let stops = await connectAll({ baseUrl, container: canvasRoot });
        if (!stops?.length) {
          stops = await connectAll({ baseUrl, container: document });
        }
        if (!cancelled && seqRef.current === seq && stops?.length) {
          stopHandles.current = stops;
        }
      } catch (e) {
        console.error('Wiring failed');
      }
    };

    wire();
    return () => {
      cancelled = true;
      disconnectAll();
    };
  }, [deps.editMode, deps.tdInfos, deps.components]);
}
