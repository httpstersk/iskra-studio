import { toast } from "sonner";

export const showSuccess = (title: string, description?: string) => {
  toast.success(title, { description });
};

export const showError = (title: string, description?: string) => {
  toast.error(title, { description });
};

export const showErrorFromException = (
  title: string,
  error: unknown,
  fallback = "An unknown error occurred"
) => {
  const description = error instanceof Error ? error.message : fallback;
  toast.error(title, { description });
};

export const showInfo = (title: string, description?: string) => {
  toast(title, { description });
};
