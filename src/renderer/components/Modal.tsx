import React, { useEffect } from 'react';

type Props = { open: boolean; onClose?: () => void; width?: number; children: React.ReactNode; closeOnOverlay?: boolean };

/** Центрированный диалог поверх оверлея (Figma: Support call, Pending payment, подтверждения). */
export const Modal: React.FC<Props> = ({ open, onClose, width = 520, children, closeOnOverlay = true }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={closeOnOverlay ? onClose : undefined}>
      <div className="dialog" style={{ width }} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, text, confirmText = 'Подтвердить', cancelText = 'Отмена', danger, onConfirm, onCancel }) => (
  <Modal open={open} onClose={onCancel} width={440}>
    <div className="dialog__title">{title}</div>
    {text ? <div className="dialog__text">{text}</div> : null}
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" className="btn btn--outline" style={{ flex: 1 }} onClick={onCancel}>
        {cancelText}
      </button>
      <button type="button" className="btn" style={{ flex: 1, background: danger ? 'var(--error)' : undefined }} onClick={onConfirm}>
        {confirmText}
      </button>
    </div>
  </Modal>
);
