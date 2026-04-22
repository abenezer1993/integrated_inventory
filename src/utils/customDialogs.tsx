import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomDialog from '../components/CustomDialog';
import CustomPrompt from '../components/CustomPrompt';
import CustomConfirm from '../components/CustomConfirm';

interface DialogState {
  alert: {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  };
  prompt: {
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    type?: 'text' | 'number';
    callback: (value: string | null) => void;
  };
  confirm: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error';
    callback: (confirmed: boolean) => void;
  };
}

interface DialogContextType {
  showAlert: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string, type?: 'text' | 'number') => Promise<string | null>;
  showConfirm: (title: string, message: string, confirmText?: string, cancelText?: string, type?: 'info' | 'warning' | 'error') => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    alert: { isOpen: false, title: '', message: '' },
    prompt: { isOpen: false, title: '', message: '', callback: () => {} },
    confirm: { isOpen: false, title: '', message: '', callback: () => {} }
  });

  const showAlert = (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
    setDialogState(prev => ({
      ...prev,
      alert: { isOpen: true, title, message, type }
    }));
  };

  const showPrompt = (title: string, message: string, defaultValue?: string, placeholder?: string, type?: 'text' | 'number'): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialogState(prev => ({
        ...prev,
        prompt: { 
          isOpen: true, 
          title, 
          message, 
          defaultValue, 
          placeholder, 
          type,
          callback: resolve 
        }
      }));
    });
  };

  const showConfirm = (title: string, message: string, confirmText?: string, cancelText?: string, type?: 'info' | 'warning' | 'error'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState(prev => ({
        ...prev,
        confirm: { 
          isOpen: true, 
          title, 
          message, 
          confirmText, 
          cancelText, 
          type,
          callback: resolve 
        }
      }));
    });
  };

  const closeAlert = () => {
    setDialogState(prev => ({
      ...prev,
      alert: { isOpen: false, title: '', message: '' }
    }));
  };

  const closePrompt = (value: string | null) => {
    dialogState.prompt.callback(value);
    setDialogState(prev => ({
      ...prev,
      prompt: { isOpen: false, title: '', message: '', callback: () => {} }
    }));
  };

  const closeConfirm = (confirmed: boolean) => {
    dialogState.confirm.callback(confirmed);
    setDialogState(prev => ({
      ...prev,
      confirm: { isOpen: false, title: '', message: '', callback: () => {} }
    }));
  };

  return (
    <DialogContext.Provider value={{ showAlert, showPrompt, showConfirm }}>
      {children}
      
      <CustomDialog
        isOpen={dialogState.alert.isOpen}
        title={dialogState.alert.title}
        message={dialogState.alert.message}
        type={dialogState.alert.type}
        onClose={closeAlert}
      />
      
      <CustomPrompt
        isOpen={dialogState.prompt.isOpen}
        title={dialogState.prompt.title}
        message={dialogState.prompt.message}
        defaultValue={dialogState.prompt.defaultValue}
        placeholder={dialogState.prompt.placeholder}
        type={dialogState.prompt.type}
        onClose={closePrompt}
      />
      
      <CustomConfirm
        isOpen={dialogState.confirm.isOpen}
        title={dialogState.confirm.title}
        message={dialogState.confirm.message}
        confirmText={dialogState.confirm.confirmText}
        cancelText={dialogState.confirm.cancelText}
        type={dialogState.confirm.type}
        onClose={closeConfirm}
      />
    </DialogContext.Provider>
  );
};

export const useCustomDialogs = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useCustomDialogs must be used within a DialogProvider');
  }
  return context;
};

// Custom alert function for backward compatibility
export const customAlert = (message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
  const dialog = useCustomDialogs();
  return dialog.showAlert(type === 'error' ? 'Error' : type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Information', message, type);
};

// Custom prompt function
export const customPrompt = (title: string, message: string, defaultValue?: string, placeholder?: string, type?: 'text' | 'number') => {
  const dialog = useCustomDialogs();
  return dialog.showPrompt(title, message, defaultValue, placeholder, type);
};

// Custom confirm function
export const customConfirm = (title: string, message: string, confirmText?: string, cancelText?: string, type?: 'info' | 'warning' | 'error') => {
  const dialog = useCustomDialogs();
  return dialog.showConfirm(title, message, confirmText, cancelText, type);
};
