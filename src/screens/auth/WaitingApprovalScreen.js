import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { appAlert, appConfirm } from "../../utils/alerts";
import { useNavigation, useRoute } from "@react-navigation/native";
import { C } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { Btn } from "../../components/ui/index";
import { KeyboardScroll } from "../../components/ui/KeyboardScroll";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight || 30) : 44;

export default function WaitingApprovalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { approvals } = useApp();

  const params = route.params || {};
  const phone = String(params.phone || "").replace(/\D/g, "");
  const request = approvals.find((a) => String(a.phone || "").replace(/\D/g, "") === phone);
  const status = request?.status || "pending";
  const isAdminRequest = (request?.type || "") === "admin_request" || params.role === "admin";
  const approver = isAdminRequest ? "SuperAdmin" : "Organisation Admin";
  const displayName = request?.name || params.name || "User";
  const displayRole = request?.role || params.role || "user";
  const submitted = request?.submitted || "Just now";

  const statusConfig = {
    pending: {
      icon: "⏳",
      title: "Waiting for Approval",
      color: C.warningDark,
      bg: C.warningLight,
      message: `${approver} will review your request. After approval, login using this same phone number and password.`,
    },
    approved: {
      icon: "✅",
      title: "Approved",
      color: C.successDark,
      bg: C.successLight,
      message: "Your request is approved. You can login now.",
    },
    rejected: {
      icon: "❌",
      title: "Request Rejected",
      color: C.dangerDark,
      bg: C.dangerLight,
      message: `Your request was rejected. Please contact your ${approver}.`,
    },
  };

  const current = statusConfig[status] || statusConfig.pending;

  const checkStatus = () => {
    if (status === "approved") {
      appAlert("Approved ✅", "Your account is approved. Please login now.");
      navigation.navigate("Login");
      return;
    }
    if (status === "rejected") {
      appAlert("Rejected", `Please contact your ${approver}.`);
      return;
    }
    appAlert("Still Pending", `Your request is still waiting for ${approver} approval.`);
  };

  return (
    <View style={S.root}>
      <StatusBar backgroundColor={C.header} barStyle="light-content" translucent />
      <KeyboardScroll>
        <View style={[S.hero, { paddingTop: STATUS_H + 28 }]}>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={S.backBtn}>
            <Text style={S.backArrow}>‹</Text>
            <Text style={S.backTxt}>Back to Login</Text>
          </TouchableOpacity>
          <Text style={S.heroTitle}>Approval Status</Text>
          <Text style={S.heroSub}>Track your registration request</Text>
        </View>

        <View style={S.card}>
          <View style={[S.statusCircle, { backgroundColor: current.bg }]}>
            <Text style={S.statusIcon}>{current.icon}</Text>
          </View>

          <Text style={[S.title, { color: current.color }]}>{current.title}</Text>
          <Text style={S.message}>{current.message}</Text>

          <View style={S.infoBox}>
            <Info label="Name" value={displayName} />
            <Info label="Registered Phone" value={phone || "—"} />
            <Info label="Role" value={displayRole} />
            <Info label="Approval By" value={approver} />
            <Info label="Submitted" value={submitted} />
            <Info label="Status" value={status.toUpperCase()} />
          </View>

          <View style={S.noteBox}>
            <Text style={S.noteTitle}>Important</Text>
            <Text style={S.noteText}>Admin approval is matched with the phone number used during registration.</Text>
            <Text style={S.noteText}>Use the same phone number when you login after approval.</Text>
          </View>

          <Btn title="Check Status" onPress={checkStatus} />
          <Btn title="Go to Login" onPress={() => navigation.navigate("Login")} />
        </View>
      </KeyboardScroll>
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoValue}>{value}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  hero:         { backgroundColor: C.header, paddingHorizontal: 22, paddingBottom: 28 },
  backBtn:      { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backArrow:    { color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: "300", lineHeight: 28, marginRight: 2 },
  backTxt:      { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "700" },
  heroTitle:    { fontSize: 30, fontWeight: "900", color: C.white, marginBottom: 4 },
  heroSub:      { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "600" },
  card:         { backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22 },
  statusCircle: { width: 86, height: 86, borderRadius: 43, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  statusIcon:   { fontSize: 42 },
  title:        { fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  message:      { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center", marginBottom: 18 },
  infoBox:      { width: "100%", backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  infoRow:      { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel:    { color: C.muted, fontSize: 12, fontWeight: "800", flex: 1 },
  infoValue:    { color: C.text, fontSize: 12, fontWeight: "900", flex: 1.2, textAlign: "right" },
  noteBox:      { width: "100%", backgroundColor: C.primaryLight, borderRadius: 14, padding: 14, marginBottom: 12 },
  noteTitle:    { color: C.accent, fontSize: 12, fontWeight: "900", marginBottom: 6 },
  noteText:     { color: C.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
});
