'use client';

import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-emerald-600 hover:bg-emerald-700 text-white'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
          </div>

          <p className="text-slate-600 mb-6">
            {message}
          </p>

          <div className="flex space-x-3 justify-end">
            <button
              type="button"
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors duration-200"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${confirmButtonClass}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;