import React, { useState, useEffect } from 'react';

// Global dialog state
let dialogQueue: Array<{
  type: 'alert' | 'prompt' | 'confirm';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  confirmText?: string;
  cancelText?: string;
  dialogType?: 'info' | 'success' | 'warning' | 'error';
  resolve: (value: any) => void;
}> = [];

let listeners: (() => void)[] = [];

// Simple dialog manager
class SimpleDialogManager {
  private currentDialog: any = null;
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener());
  }

  getCurrentDialog() {
    return this.currentDialog;
  }

  showAlert(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    return new Promise((resolve) => {
      this.currentDialog = {
        type: 'alert',
        title,
        message,
        dialogType: type,
        resolve
      };
      this.notify();
    });
  }

  showPrompt(title: string, message: string, defaultValue = '', placeholder = '', inputType: 'text' | 'number' = 'text'): Promise<string | null> {
    return new Promise((resolve) => {
      this.currentDialog = {
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        inputType,
        resolve
      };
      this.notify();
    });
  }

  showConfirm(title: string, message: string, confirmText = 'OK', cancelText = 'Cancel', type: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    return new Promise((resolve) => {
      this.currentDialog = {
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        dialogType: type,
        resolve
      };
      this.notify();
    });
  }

  closeDialog(value: any) {
    if (this.currentDialog) {
      this.currentDialog.resolve(value);
      this.currentDialog = null;
      this.notify();
    }
  }
}

export const dialogManager = new SimpleDialogManager();

// Hook for using dialogs
export const useDialogs = () => {
  const [currentDialog, setCurrentDialog] = useState(dialogManager.getCurrentDialog());

  useEffect(() => {
    const unsubscribe = dialogManager.subscribe(() => {
      setCurrentDialog(dialogManager.getCurrentDialog());
    });
    return unsubscribe;
  }, []);

  const closeDialog = (value: any) => {
    dialogManager.closeDialog(value);
  };

  return { currentDialog, closeDialog };
};

// Global functions that can be called from anywhere
export const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  return dialogManager.showAlert(title, message, type);
};

export const showPrompt = (title: string, message: string, defaultValue = '', placeholder = '', inputType: 'text' | 'number' = 'text') => {
  return dialogManager.showPrompt(title, message, defaultValue, placeholder, inputType);
};

export const showConfirm = (title: string, message: string, confirmText = 'OK', cancelText = 'Cancel', type: 'info' | 'warning' | 'error' = 'info') => {
  return dialogManager.showConfirm(title, message, confirmText, cancelText, type);
};
