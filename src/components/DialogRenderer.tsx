import React from 'react';
import { useDialogs } from '../utils/simpleDialogs';

const DialogRenderer: React.FC = () => {
  const { currentDialog, closeDialog } = useDialogs();

  // Keep hooks unconditional (React hook rules)
  const [promptValue, setPromptValue] = React.useState('');

  React.useEffect(() => {
    if (currentDialog?.type === 'prompt') {
      setPromptValue(currentDialog.defaultValue || '');
    }
  }, [currentDialog?.type, currentDialog?.defaultValue]);

  if (!currentDialog) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeDialog(currentDialog.type === 'confirm' ? false : (currentDialog.type === 'prompt' ? null : undefined));
    }
  };

  const getIcon = () => {
    const type = currentDialog.dialogType || 'info';
    switch (type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getBgColor = () => {
    const type = currentDialog.dialogType || 'info';
    switch (type) {
      case 'success': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      default: return 'bg-blue-50';
    }
  };

  const getConfirmButtonColor = () => {
    const type = currentDialog.dialogType || 'info';
    switch (type) {
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  // Alert Dialog
  if (currentDialog.type === 'alert') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleBackdropClick}
          />

          <div className="inline-block transform overflow-hidden rounded-lg text-left align-bottom transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
            <div className={`${getBgColor()} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
              {getIcon()}
              <div className="mt-3 text-center sm:mt-0">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {currentDialog.title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {currentDialog.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => closeDialog(undefined)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prompt Dialog
  if (currentDialog.type === 'prompt') {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      closeDialog(promptValue);
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleBackdropClick}
          />

          <div className="inline-block transform overflow-hidden rounded-lg text-left align-bottom transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle bg-white">
            <form onSubmit={handleSubmit}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {currentDialog.title}
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-4">
                      {currentDialog.message}
                    </p>
                    <input
                      type={currentDialog.inputType || 'text'}
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      placeholder={currentDialog.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  OK
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => closeDialog(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Confirm Dialog
  if (currentDialog.type === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleBackdropClick}
          />

          <div className="inline-block transform overflow-hidden rounded-lg text-left align-bottom transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle bg-white">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {getIcon()}
              <div className="mt-3 text-center sm:mt-0">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {currentDialog.title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {currentDialog.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${getConfirmButtonColor()}`}
                onClick={() => closeDialog(true)}
              >
                {currentDialog.confirmText || 'OK'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => closeDialog(false)}
              >
                {currentDialog.cancelText || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DialogRenderer;
