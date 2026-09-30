import { createContext, useContext } from "react";

// Non-blocking confirmations ("Offer published", "Profile saved"...); see ToastProvider.
export const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}
