import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

function Modal({
  title,
  message,
  type,
  onClose,
  colors,
  onConfirm,
  confirmText,
  cancelText,
  show,
}) {
  const [isVisibleDelayed, setIsVisibleDelayed] = useState(false);

  useEffect(() => {
    let timer;
    if (show) {
      timer = setTimeout(() => setIsVisibleDelayed(true), 10);
    } else {
      setIsVisibleDelayed(false);
    }
    return () => clearTimeout(timer);
  }, [show]);

  const onModalTransitionEnd = () => {
    if (!isVisibleDelayed && !show && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleConfirmRequest = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  };

  const handleCloseRequest = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  if (!show && !isVisibleDelayed) {
    return null;
  }

  let icon,
    titleColorClass,
    currentPrimaryButtonBg = colors.buttonPrimaryBg,
    currentPrimaryButtonHoverBg = colors.buttonPrimaryHoverBg;
  switch (type) {
    case 'success':
      icon = <CheckCircle size={32} className="text-green-500" />;
      titleColorClass = 'text-green-700';
      break;
    case 'error':
      icon = <XCircle size={32} className="text-red-500" />;
      titleColorClass = 'text-red-700';
      currentPrimaryButtonBg = colors.buttonDestructiveBg;
      currentPrimaryButtonHoverBg = colors.buttonDestructiveHoverBg;
      break;
    case 'confirmation':
      icon = <AlertTriangle size={32} className="text-amber-500" />;
      titleColorClass = 'text-amber-700';
      break;
    default:
      icon = <Info size={32} className="text-sky-500" />;
      titleColorClass = 'text-sky-700';
  }

  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ease-out ${
        isVisibleDelayed
          ? 'bg-opacity-60 opacity-100'
          : 'bg-opacity-0 opacity-0 pointer-events-none'
      }`}
      onTransitionEnd={onModalTransitionEnd}
      onClick={type !== 'confirmation' ? handleCloseRequest : undefined}
    >
      <div
        className={`${
          colors.cardBg
        } p-6 rounded-xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out ${
          isVisibleDelayed ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          {icon}
          <h3 className={`text-xl font-semibold ml-3 ${titleColorClass}`}>
            {title}
          </h3>
        </div>
        <p className={`${colors.darkAccent} mb-6 text-sm whitespace-pre-wrap`}>
          {message}
        </p>
        {type === 'confirmation' && typeof onConfirm === 'function' ? (
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCloseRequest}
              className={`${colors.buttonSecondaryBg} ${colors.buttonSecondaryText} px-4 py-2 rounded-lg ${colors.buttonSecondaryHoverBg}`}
            >
              {cancelText || 'Abbrechen'}
            </button>
            <button
              onClick={handleConfirmRequest}
              className={`${colors.buttonDestructiveBg} ${colors.buttonDestructiveText} px-4 py-2 rounded-lg ${colors.buttonDestructiveHoverBg}`}
            >
              {confirmText || 'Bestätigen'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleCloseRequest}
            className={`${currentPrimaryButtonBg} ${colors.buttonPrimaryText} w-full px-4 py-2 rounded-lg ${currentPrimaryButtonHoverBg}`}
          >
            Schließen
          </button>
        )}
      </div>
    </div>
  );
}

export default Modal;
