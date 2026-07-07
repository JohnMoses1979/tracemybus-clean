import { Platform, StatusBar } from "react-native";
import { C } from "./theme";

// Status bar height + extra breathing room
export const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight || 30) : 44;
export const BLUE_TOP_PADDING_BOTTOM = 20;

// Shared page-level styles used across all screens
export const pageStyles = {
  page: {
    flex: 1,
    backgroundColor: C.bg,
  },
  blueTop: {
    backgroundColor: C.header,
    paddingBottom: BLUE_TOP_PADDING_BOTTOM,
  },
  roundBody: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 42,
    marginTop: -2,
  },
};
