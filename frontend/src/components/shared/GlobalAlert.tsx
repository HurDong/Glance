import React from 'react';
import { useAlertStore } from '../../stores/useAlertStore';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const GlobalAlert: React.FC = () => {
  const { isOpen, type, title, message, confirmText, cancelText, closeAlert } = useAlertStore();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-500 w-12 h-12 mb-4" />;
      case 'error':
        return <XCircle className="text-destructive w-12 h-12 mb-4" />;
      case 'warning':
      case 'confirm':
        return <AlertCircle className="text-yellow-500 w-12 h-12 mb-4" />;
      case 'info':
      default:
        return <Info className="text-blue-500 w-12 h-12 mb-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => type !== 'confirm' ? closeAlert(false) : null}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-background border border-border shadow-2xl rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transform transition-all scale-100 opacity-100">
        {getIcon()}
        
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        
        <p className="text-muted-foreground text-sm font-medium mb-8 whitespace-pre-wrap leading-relaxed">
          {message}
        </p>

        <div className="flex w-full gap-3">
          {type === 'confirm' && (
            <button
              onClick={() => closeAlert(false)}
              className="flex-1 py-3 px-4 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center justify-center h-12"
            >
              {cancelText || '취소'}
            </button>
          )}
          <button
            onClick={() => closeAlert(true)}
            className={clsx(
              "flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center h-12 hover:opacity-90 active:scale-[0.98]",
              type === 'error' ? "bg-destructive text-destructive-foreground" :
              type === 'success' ? "bg-green-500 text-white" :
              "bg-primary text-primary-foreground"
            )}
          >
            {confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};
