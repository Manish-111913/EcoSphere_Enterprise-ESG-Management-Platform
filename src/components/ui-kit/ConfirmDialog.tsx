import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  entityName?: string; // Entity name to type if isDestructive is true
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  entityName = '',
  loading = false
}: ConfirmDialogProps) {
  const [typedName, setTypedName] = useState('');

  // Clear typing on open/close
  useEffect(() => {
    if (!isOpen) {
      setTypedName('');
    }
  }, [isOpen]);

  const isConfirmedDisabled = isDestructive && entityName && typedName !== entityName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmedDisabled || loading) return;
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-text-dark/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 pointer-events-auto"
            id="confirm-dialog-overlay"
          />

          {/* Modal Box */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-white border border-neutral-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto flex flex-col"
              id="confirm-dialog-container"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-neutral-border flex items-start justify-between gap-4 text-left">
                <div className="flex items-center gap-2.5">
                  {isDestructive && (
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 animate-bounce" />
                  )}
                  <h3 className="text-sm font-black text-neutral-text-dark tracking-tight">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition shrink-0"
                  id="btn-close-confirm-dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
                <p className="text-xs text-neutral-text-muted leading-relaxed font-semibold">
                  {description}
                </p>

                {isDestructive && entityName && (
                  <div className="space-y-2 bg-red-50/50 border border-red-100 p-3.5 rounded-xl">
                    <label className="text-[10px] font-black uppercase text-red-700 tracking-wider block">
                      To confirm delete, type <strong className="select-all text-neutral-text-dark px-1 bg-white rounded border border-red-200">"{entityName}"</strong> below:
                    </label>
                    <input
                      type="text"
                      placeholder={entityName}
                      value={typedName}
                      onChange={e => setTypedName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white text-neutral-text-dark font-mono font-bold"
                      autoComplete="off"
                      id="confirm-dialog-destructive-input"
                    />
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-black uppercase tracking-wider text-neutral-text-muted hover:text-neutral-text-dark px-4 py-2 rounded-xl border border-neutral-border bg-white transition"
                    disabled={loading}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="submit"
                    className={`text-xs font-black uppercase tracking-wider text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow ${
                      isDestructive
                        ? isConfirmedDisabled
                          ? 'bg-red-300 cursor-not-allowed shadow-none'
                          : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                        : 'bg-primary-teal hover:bg-primary-teal-dark active:bg-primary-teal-darker'
                    }`}
                    disabled={isConfirmedDisabled || loading}
                    id="btn-confirm-dialog-submit"
                  >
                    {loading ? (
                      <span className="h-3 w-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : null}
                    <span>{confirmLabel}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
