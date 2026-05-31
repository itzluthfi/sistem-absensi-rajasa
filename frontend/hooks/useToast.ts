/**
 * useToast — Cross-platform toast notification utility
 *
 * Web (Vercel):   uses react-hot-toast  → beautiful floating toasts
 * Native (Android/iOS): uses react-native-toast-message → native toast
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Berhasil disimpan!");
 *   toast.error("Gagal memuat data.");
 *   toast.info("Data diperbarui.");
 */

import { Platform } from "react-native";

// Lazy load to avoid native bundle including web code and vice versa
let _hotToast: any = null;
let _nativeToast: any = null;

if (Platform.OS === "web") {
  _hotToast = require("react-hot-toast").default;
} else {
  _nativeToast = require("react-native-toast-message").default;
}

// ─── Toast API ────────────────────────────────────────────────────────────────

const showToast = (type: "success" | "error" | "info", message: string, title?: string) => {
  if (Platform.OS === "web" && _hotToast) {
    switch (type) {
      case "success":
        _hotToast.success(message, {
          duration: 3500,
          style: {
            background: "#ECFDF5",
            color: "#065F46",
            border: "1px solid #A7F3D0",
            fontWeight: "600",
            fontSize: "14px",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 8px 24px rgba(6, 95, 70, 0.08)",
          },
          iconTheme: { primary: "#10B981", secondary: "#ECFDF5" },
        });
        break;
      case "error":
        _hotToast.error(message, {
          duration: 4500,
          style: {
            background: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FCA5A5",
            fontWeight: "600",
            fontSize: "14px",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 8px 24px rgba(153, 27, 27, 0.08)",
          },
          iconTheme: { primary: "#EF4444", secondary: "#FEF2F2" },
        });
        break;
      case "info":
        _hotToast(message, {
          duration: 3000,
          style: {
            background: "#EFF6FF",
            color: "#1E40AF",
            border: "1px solid #93C5FD",
            fontWeight: "600",
            fontSize: "14px",
            borderRadius: "12px",
            padding: "14px 18px",
            boxShadow: "0 8px 24px rgba(30, 64, 175, 0.08)",
          },
          icon: "ℹ️",
        });
        break;
    }
  } else if (_nativeToast) {
    _nativeToast.show({
      type: type === "info" ? "info" : type,
      text1: title || (type === "success" ? "Berhasil" : type === "error" ? "Gagal" : "Info"),
      text2: message,
      visibilityTime: type === "error" ? 4500 : 3000,
      topOffset: 60,
    });
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = () => ({
  success: (message: string, title?: string) => showToast("success", message, title),
  error: (message: string, title?: string) => showToast("error", message, title),
  info: (message: string, title?: string) => showToast("info", message, title),
});

// Also export as standalone functions for use outside components
export const toast = {
  success: (message: string, title?: string) => showToast("success", message, title),
  error: (message: string, title?: string) => showToast("error", message, title),
  info: (message: string, title?: string) => showToast("info", message, title),
};

export default toast;
