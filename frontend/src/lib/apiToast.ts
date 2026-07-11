import { toast } from 'sonner';

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const toastApiError = (error: unknown, fallback: string): string => {
  const message = getErrorMessage(error, fallback);
  toast.error(message);
  return message;
};
