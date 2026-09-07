import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Ширина панели, px. */
  width?: number;
  /** Выравнивание относительно якоря. */
  align?: 'left' | 'right';
  anchor: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Поповер под якорем (замена полноэкранных modal-ов RN на десктопе):
 * закрывается по клику вне панели и по Escape.
 */
export const Popover: React.FC<Props> = ({ open, onClose, width = 360, align = 'left', anchor, children, className }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className={'popover' + (className ? ` ${className}` : '')} style={{ position: 'relative', minWidth: 0 }}>
      {anchor}
      {open ? (
        <div
          className="popover__panel"
          role="dialog"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width,
            maxWidth: 'calc(100vw - var(--rail-w) - 2 * var(--content-pad))',
            background: 'var(--surface)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-pop)',
            border: '1px solid var(--border)',
            padding: 16,
            zIndex: 50,
          }}>
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default Popover;
