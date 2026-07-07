import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, ROLE_MAP } from "../constants/theme";
import { Avatar } from "./ui/index";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "../context/AppContext";

// Safe top padding — accounts for status bar on Android & notch on iOS
const STATUS_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 30) : 44;
const TOP_PAD = STATUS_HEIGHT + 8;

// ── Back Button ───────────────────────────────────────────────────────────────
function BackButton({ color = "rgba(255,255,255,0.85)" }) {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
      <Text style={[styles.backArrow, { color }]}>‹</Text>
      <Text style={[styles.backText, { color }]}>Back</Text>
    </TouchableOpacity>
  );
}

// ── Top Header (Home screens — avatar tap → profile) ─────────────────────────
export function TopHeader({ user, subtitle }) {
  const role = ROLE_MAP[user?.role];
  const navigation = useNavigation();
  const app = useApp() || {};
  const notificationStore = app.notifications;
  const myNotifs = Array.isArray(notificationStore)
    ? notificationStore.filter((n) => !n.userId || n.userId === user?.id)
    : Array.isArray(notificationStore?.[user?.id])
      ? notificationStore[user?.id]
      : [];
  const unread = myNotifs.filter((n) => !n.read).length;

  return (
    <LinearGradient
      colors={[C.header, "#10283A", C.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.topHeader, { paddingTop: TOP_PAD }]}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate("Profile")}
        activeOpacity={0.88}
        style={styles.profilePress}
      >
        <Avatar user={user} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.topSub}>{subtitle || role?.label}</Text>
          <Text style={styles.topTitle}>Hi, {user?.name?.split(" ")[0] || "User"} 👋</Text>
          <Text style={styles.topMini}>Have a safe trip today</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Notifications")}
        activeOpacity={0.85}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.bellButton}
      >
        <Text style={{ fontSize: 23 }}>🔔</Text>
        {unread > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ── Sub Header (Inner screens — always shows back button if can go back) ──────
export function SubHeader({ title, subtitle, onBack }) {
  const navigation = useNavigation();
  const canBack = navigation.canGoBack();

  return (
    <LinearGradient
      colors={[C.header, "#10283A", C.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.subHeader, { paddingTop: TOP_PAD }]}
    >
      {canBack && (
        <TouchableOpacity
          onPress={onBack || (() => navigation.goBack())}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
      {subtitle ? <Text style={styles.subSub}>{subtitle}</Text> : null}
      <Text style={styles.subTitle}>{title}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Top header
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  profilePress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topSub: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  topTitle: { color: C.white, fontSize: 21, fontWeight: "900", marginTop: 2 },
  topMini: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", marginTop: 2 },

  bellButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sub header
  subHeader: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  subSub: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800", marginTop: 6 },
  subTitle: { color: C.white, fontSize: 24, fontWeight: "900", marginTop: 3, letterSpacing: 0.2 },

  // Back button
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -4,
    backgroundColor: C.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.header,
  },
  bellBadgeText: { color: C.white, fontSize: 9, fontWeight: "900" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  backArrow: { color: "rgba(255,255,255,0.85)", fontSize: 23, fontWeight: "300", lineHeight: 24, marginRight: 2 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "900" },
});
