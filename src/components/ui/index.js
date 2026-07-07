import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, ROLE_MAP } from "../../constants/theme";

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ user, size = 44 }) {
  const role = ROLE_MAP[user?.role] || ROLE_MAP.school;
  const initials =
    user?.initials ||
    String(user?.name || "?")
      .split(" ")
      .map((w) => w[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const photoUri = user?.profilePhoto || user?.photoUri || user?.avatar || user?.imageUrl || "";

  return (
    <LinearGradient
      colors={[C.primary, "rgba(46,184,114,0.48)", C.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatarRing,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <View
        style={[
          styles.avatarInner,
          {
            width: size - 5,
            height: size - 5,
            borderRadius: (size - 5) / 2,
            backgroundColor: role.bg,
          },
        ]}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: size - 5, height: size - 5, borderRadius: (size - 5) / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: role.color, fontSize: size * 0.32, fontWeight: "900" }}>
            {initials}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({ label, type = "blue" }) {
  const map = {
    blue: [C.primaryLight, C.primary],
    green: [C.successLight, C.successDark],
    red: [C.dangerLight, C.dangerDark],
    yellow: [C.warningLight, C.warningDark],
    purple: [C.purpleLight, C.purple],
    orange: [C.orangeLight, C.orange],
    teal: [C.tealLight, C.teal],
    gray: [C.surface, C.muted],
  };
  const [bg, fg] = map[type] || map.blue;
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: `${fg}55` }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────
export function Btn({ title, onPress, color = C.primary, disabled = false, flex = 1, small = false, style }) {
  const isMuted = color === C.muted || color === C.surface;
  return (
    <TouchableOpacity
      style={[styles.btnTouch, { flex, opacity: disabled ? 0.45 : 1 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.84}
    >
      <LinearGradient
        colors={isMuted ? [C.surface, C.card] : [color, color === C.danger ? C.dangerDark : C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, { paddingVertical: small ? 10 : 14 }]}
      >
        <Text style={[styles.btnText, { color: C.white, fontSize: small ? 12 : 14 }]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineBtn({ title, onPress, color = C.accent }) {
  return (
    <TouchableOpacity style={[styles.outlineBtn, { borderColor: `${color}88` }]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[styles.outlineBtnText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={[styles.card, style]} onPress={onPress} activeOpacity={0.9}>
      {children}
    </Wrap>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────
export function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoRowIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionHeader}>{title}</Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionActionBtn} activeOpacity={0.82}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }) {
  return (
    <Card style={{ alignItems: "center", padding: 30 }}>
      <View style={styles.emptyIconWrap}>
        <Text style={{ fontSize: 36 }}>{icon}</Text>
      </View>
      <Text style={[styles.cardTitle, { marginTop: 12, textAlign: "center" }]}>{title}</Text>
      {sub ? <Text style={[styles.muted, { marginTop: 6, textAlign: "center", lineHeight: 18 }]}>{sub}</Text> : null}
    </Card>
  );
}

// ── SwitchRow ─────────────────────────────────────────────────────────────────
export function SwitchRow({ title, sub, value, onChange }) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {sub ? <Text style={styles.muted}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.primaryLight }}
        thumbColor={value ? C.primary : C.muted}
      />
    </View>
  );
}

// ── CallBtn ───────────────────────────────────────────────────────────────────
export function CallBtn({ phone }) {
  const { Linking } = require("react-native");
  return (
    <TouchableOpacity style={styles.callBtn} onPress={() => phone && Linking.openURL(`tel:${phone}`)} activeOpacity={0.82}>
      <Text style={{ color: C.white, fontWeight: "900", fontSize: 12 }}>📞 Call</Text>
    </TouchableOpacity>
  );
}

// ── LogRow ────────────────────────────────────────────────────────────────────
export function LogRow({ text }) {
  return (
    <View style={styles.logRow}>
      <View style={styles.logDot} />
      <Text style={styles.logText}>{text}</Text>
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct = 0 }) {
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${pct}%` }]}
      />
      <View style={[styles.busDot, { left: `${Math.min(88, pct)}%` }]}>
        <Text style={{ fontSize: 14 }}>🚌</Text>
      </View>
    </View>
  );
}

export const cardStyles = {
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
  muted: { color: C.muted, fontSize: 12, fontWeight: "600" },
};

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 7 },
  elevation: 5,
};

const styles = StyleSheet.create({
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  avatarInner: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.10)",
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: "900" },
  btnTouch: {
    borderRadius: 18,
    marginVertical: 4,
    overflow: "hidden",
    ...shadow,
  },
  btn: {
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  btnText: { color: C.white, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  outlineBtn: {
    borderWidth: 1.3,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    marginVertical: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  outlineBtnText: { fontSize: 13, fontWeight: "900" },
  callBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 9,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 15,
    marginBottom: 12,
    ...shadow,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoRowIcon: { fontSize: 15 },
  infoRowLabel: { fontSize: 11, color: C.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  infoRowValue: { fontSize: 14, color: C.text, fontWeight: "800", marginTop: 2, lineHeight: 19 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  sectionHeader: { fontSize: 16, fontWeight: "900", color: C.text, letterSpacing: 0.1 },
  sectionActionBtn: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(46,184,114,0.22)",
  },
  sectionAction: { fontSize: 12, fontWeight: "900", color: C.accent },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
  muted: { color: C.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  logRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 7,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
    marginRight: 10,
    marginTop: 5,
  },
  logText: { flex: 1, color: C.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  progressTrack: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 999,
    marginTop: 16,
    marginBottom: 4,
    position: "relative",
    overflow: "visible",
  },
  progressFill: { height: 8, borderRadius: 999 },
  busDot: {
    position: "absolute",
    top: -12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
