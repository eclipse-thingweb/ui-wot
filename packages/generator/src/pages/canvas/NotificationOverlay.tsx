import { useEffect, useRef } from 'react';

export type OverlayNotification = {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  showIcon?: boolean;
  showCloseButton?: boolean;
  dark?: boolean;
};

export function NotificationOverlay({ items, onClose }: { items: OverlayNotification[]; onClose: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shownRef = useRef<Set<string>>(new Set());

  // Render items as Stencil elements into the container
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    // Ensure custom element is defined
    const ensure = async () => {
      try {
        if ('customElements' in window) {
          await (customElements as any).whenDefined?.('ui-notification');
        }
      } catch {}

      // Add new items that haven't been shown
      for (const item of items) {
        if (shownRef.current.has(item.id)) continue;
        shownRef.current.add(item.id);

        const el = document.createElement('ui-notification') as any;
        (el as any).__overlayId = item.id;
        el.setAttribute('message', item.message ?? '');
        el.setAttribute('type', item.type ?? 'info');
        if (item.duration != null) el.setAttribute('duration', String(item.duration));
        if (item.showIcon != null) el.setAttribute('show-icon', String(!!item.showIcon));
        if (item.showCloseButton != null) el.setAttribute('show-close-button', String(!!item.showCloseButton));
        if (item.dark != null) el.setAttribute('dark', String(!!item.dark));

        const onClosed = () => onClose(item.id);
        try {
          el.addEventListener('notificationClose', onClosed, { once: true });
        } catch {}

        host.appendChild(el);
        try {
          el.show?.();
        } catch {}
      }

      // Remove DOM nodes for items no longer present
      const ids = new Set(items.map(i => i.id));
      const children = Array.from(host.children) as HTMLElement[];
      for (const child of children) {
        const dataId = (child as any).__overlayId as string | undefined;
        if (dataId && !ids.has(dataId)) {
          host.removeChild(child);
          shownRef.current.delete(dataId);
        }
      }
    };

    ensure();
  }, [items, onClose]);

  return (
    <div
      ref={containerRef}
      className="uiwot-notification-overlay"
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'auto',
      }}
    />
  );
}
