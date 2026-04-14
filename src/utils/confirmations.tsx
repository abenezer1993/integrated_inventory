import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => void;
  hideConfirmation: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [confirmation, setConfirmation] = useState<ConfirmationOptions | null>(null);

  const showConfirmation = (options: ConfirmationOptions) => {
    setConfirmation(options);
  };

  const hideConfirmation = () => {
    setConfirmation(null);
  };

  const handleConfirm = () => {
    if (confirmation?.onConfirm) {
      confirmation.onConfirm();
    }
    hideConfirmation();
  };

  const handleCancel = () => {
    if (confirmation?.onCancel) {
      confirmation.onCancel();
    }
    hideConfirmation();
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation, hideConfirmation }}>
      {children}
      {confirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              {confirmation.type === 'danger' && (
                <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              {confirmation.type === 'warning' && (
                <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{confirmation.title}</h3>
            </div>
            
            <p className="text-gray-600 mb-6">{confirmation.message}</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                {confirmation.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-md transition-colors ${
                  confirmation.type === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : confirmation.type === 'warning'
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {confirmation.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};

// Helper function for direct usage
export const showConfirmation = (options: ConfirmationOptions) => {
  // This will be used with the context
  console.log('showConfirmation called with:', options);
};

// Simple replacement for confirm() that can be used globally
export const customConfirm = (message: string, onConfirm: () => void) => {
  // This needs to be used within a component that has access to the context
  console.log('customConfirm called:', message);
  // For now, fall back to browser confirm until we update all components
  if (window.confirm(message)) {
    onConfirm();
  }
};
