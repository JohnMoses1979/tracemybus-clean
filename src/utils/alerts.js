import { Alert, Platform } from "react-native";

const toText = (title, message) => {
  const t = String(title || "Alert");
  const m = message ? String(message) : "";
  return m ? `${t}\n\n${m}` : t;
};

export const appAlert = (title, message, buttonsOrOptions) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(toText(title, message));
    const okButton = Array.isArray(buttonsOrOptions)
      ? buttonsOrOptions.find((b) => typeof b?.onPress === "function")
      : null;
    okButton?.onPress?.();
    return;
  }
  Alert.alert(String(title || "Alert"), message ? String(message) : "", buttonsOrOptions);
};

export const appConfirm = (title, message, onConfirm, options = {}) => {
  const confirmText = options.confirmText || "OK";
  const cancelText = options.cancelText || "Cancel";

  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(toText(title, message))) {
      onConfirm?.();
    }
    return;
  }

  Alert.alert(String(title || "Confirm"), message ? String(message) : "", [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: options.destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
};
