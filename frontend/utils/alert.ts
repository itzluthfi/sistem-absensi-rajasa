import { Alert, Platform } from "react-native";

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (Platform.OS === "web") {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel", onPress: onCancel },
      { text: "Hapus", style: "destructive", onPress: onConfirm },
    ]);
  }
};
