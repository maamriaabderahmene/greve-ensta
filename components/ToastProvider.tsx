'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-2xl backdrop-blur-sm animate-slide-in border-2 ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            )}
            {toast.type === 'error' && (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            {toast.type === 'info' && (
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            )}
            
            <p className={`flex-1 text-sm font-medium ${
              toast.type === 'success'
                ? 'text-green-800'
                : toast.type === 'error'
                ? 'text-red-800'
                : 'text-blue-800'
            }`}>
              {toast.message}
            </p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors ${
                toast.type === 'success'
                  ? 'text-green-600'
                  : toast.type === 'error'
                  ? 'text-red-600'
                  : 'text-blue-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
