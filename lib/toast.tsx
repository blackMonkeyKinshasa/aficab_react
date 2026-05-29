import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';

import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';

export type ToastAction = 'success' | 'error' | 'warning' | 'info' | 'muted';

export interface ShowToastOptions {
  title?: string;
  description: string;
  action?: ToastAction;
  duration?: number;
}

type ToastController = ReturnType<typeof useToast>;

const ToastControllerContext = createContext<ToastController | null>(null);

let toastControllerRef: ToastController | null = null;

function renderToastContent(id: string, { title, description, action = 'info' }: ShowToastOptions) {
  return (
    <Toast nativeID={id} action={action} variant="solid">
      {title ? <ToastTitle>{title}</ToastTitle> : null}
      <ToastDescription>{description}</ToastDescription>
    </Toast>
  );
}

function showToastWithController(toast: ToastController, options: ShowToastOptions) {
  try {
    toast.show({
      placement: 'bottom',
      duration: options.duration ?? 4000,
      render: ({ id }) => renderToastContent(id, options),
    });
  } catch (error) {
    console.warn('showToast failed', error, options.description);
  }
}

export function ToastBridgeProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  useEffect(() => {
    toastControllerRef = toast;

    return () => {
      toastControllerRef = null;
    };
  }, [toast]);

  return (
    <ToastControllerContext.Provider value={toast}>{children}</ToastControllerContext.Provider>
  );
}

function useToastController() {
  return useContext(ToastControllerContext);
}

export function showToast(options: ShowToastOptions) {
  if (!toastControllerRef) {
    console.warn('showToast called before ToastBridgeProvider was mounted', options.description);
    return;
  }

  showToastWithController(toastControllerRef, options);
}

export function showErrorToast(title: string, description: string) {
  showToast({ title, description, action: 'error' });
}

export function showSuccessToast(title: string, description: string) {
  showToast({ title, description, action: 'success' });
}

export function showInfoToast(title: string, description: string) {
  showToast({ title, description, action: 'info' });
}

export function showWarningToast(title: string, description: string) {
  showToast({ title, description, action: 'warning' });
}

export function useAppToast() {
  const toast = useToastController();

  return useCallback(
    (options: ShowToastOptions) => {
      if (toast) {
        showToastWithController(toast, options);
        return;
      }

      showToast(options);
    },
    [toast]
  );
}
