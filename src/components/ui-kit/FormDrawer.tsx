import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isDirty?: boolean; // Form has unsaved modifications
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export default function FormDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  isDirty = false,
  children,
  footerActions
}: FormDrawerProps) {
  // Lock document scroll when drawer is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCloseAttempt = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to close this drawer and discard all modifications?'
      );
      if (!confirmLeave) return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseAttempt}
            className="fixed inset-0 bg-neutral-text-dark/40 backdrop-blur-xs z-50 pointer-events-auto"
            id="form-drawer-overlay"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col pointer-events-auto border-l border-neutral-border"
            id="form-drawer-container"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-border bg-neutral-bg/10 flex items-start justify-between gap-4 shrink-0 text-left">
              <div>
                <h3 className="text-sm font-black text-neutral-text-dark tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] text-neutral-text-muted mt-1 leading-relaxed font-semibold">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseAttempt}
                className="p-1.5 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition shrink-0"
                title="Close drawer"
                id="btn-close-form-drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Unsaved Changes Banner (Only if dirty) */}
            {isDirty && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2.5 shrink-0 text-left">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                  Unsaved modifications active
                </span>
              </div>
            )}

            {/* Scrollable Drawer Content Stage */}
            <div className="flex-grow p-6 overflow-y-auto text-left space-y-6">
              {children}
            </div>

            {/* Drawer Footer Actions Row */}
            <div className="p-5 border-t border-neutral-border bg-neutral-bg/30 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={handleCloseAttempt}
                className="text-xs font-black uppercase tracking-wider text-neutral-text-muted hover:text-neutral-text-dark px-4 py-2 rounded-xl border border-neutral-border hover:bg-white transition"
              >
                Cancel
              </button>
              {footerActions && <div className="flex items-center gap-3">{footerActions}</div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
