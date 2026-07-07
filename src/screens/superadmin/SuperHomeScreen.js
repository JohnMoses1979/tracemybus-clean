import React from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { Card, InfoRow, SectionHeader, Chip, Btn, EmptyState } from "../../components/ui/index";
import { TopHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";

export default function SuperHomeScreen({ navigation }) {
  const { currentUser, orgs, users, trips, approvals } = useApp();

  const adminRequests = approvals.filter((a) => a.type === "admin_request" && a.status === "pending");
  const totalOrgs     = orgs.length;
  const totalUsers    = users.filter((u) => !["admin", "superadmin"].includes(u.role)).length;

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <TopHeader user={currentUser} onProfilePress={() => navigation.navigate("Profile")} subtitle="Super Admin" />
        <View style={S.statsCard}>
          {[
            { icon: "🏢", val: totalOrgs,            label: "Organisations", screen: "SuperOrgs"      },
            { icon: "👥", val: totalUsers,           label: "Total Users",   screen: null             },
            { icon: "📝", val: adminRequests.length, label: "Pending",       screen: "SuperApprovals" },
          ].map((s) => (
            <TouchableOpacity
              key={s.label}
              style={S.statBox}
              onPress={() => s.screen && navigation.navigate(s.screen)}
              activeOpacity={s.screen ? 0.7 : 1}
            >
              <Text style={S.statIcon}>{s.icon}</Text>
              <Text style={S.statVal}>{s.val}</Text>
              <Text style={S.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={pageStyles.roundBody}>
        {adminRequests.length > 0 && (
          <TouchableOpacity style={S.alertBanner} onPress={() => navigation.navigate("SuperApprovals")}>
            <Text style={S.alertText}>📝  {adminRequests.length} organisation request{adminRequests.length !== 1 ? "s" : ""} waiting for approval  →</Text>
          </TouchableOpacity>
        )}

        <SectionHeader title="Quick Actions" />
        <View style={S.grid}>
          {[
            { icon: "✅", label: "Org Approvals",    screen: "SuperApprovals", color: C.success },
            { icon: "🏢", label: "All Organisations", screen: "SuperOrgs",      color: C.primary },
            { icon: "📢", label: "Broadcast All",     screen: "Broadcast",      color: C.purple  },
            { icon: "👤", label: "My Profile",        screen: "Profile",        color: C.primary   },
          ].map((item) => (
            <View key={item.label} style={S.gridItem}>
              <Btn
                title={`${item.icon}  ${item.label}`}
                color={item.color}
                onPress={() => navigation.navigate(item.screen)}
              />
            </View>
          ))}
        </View>

        <SectionHeader title="All Organisations" />
        {orgs.length === 0 ? (
          <EmptyState icon="🏢" title="No organisations yet" sub="Pending approvals will appear here." />
        ) : orgs.map((org) => {
          const admin    = users.find((u) => u.id === org.adminId);
          const orgTrips = Object.values(trips).filter((t) => t.orgId === org.id);
          const live     = orgTrips.filter((t) => t.status === "live").length;
          return (
            <Card key={org.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={[S.orgDot, { backgroundColor: org.color || C.primary }]} />
                <Chip label={org.type} type="blue" />
                <Chip label={live > 0 ? `${live} Live` : "Idle"} type={live > 0 ? "green" : "gray"} />
              </View>
              <Text style={S.orgName}>{org.name}</Text>
              <InfoRow icon="📍" label="Address" value={org.address || "—"} />
              <InfoRow icon="👤" label="Admin"   value={admin?.name  || "—"} />
              <InfoRow icon="📱" label="Phone"   value={org.phone    || "—"} />
              <InfoRow icon="📅" label="Joined"  value={org.createdAt|| "—"} />
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  statsCard:   { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, flexDirection: "row", padding: 12, marginTop: 4 },
  statBox:     { flex: 1, alignItems: "center" },
  statIcon:    { fontSize: 22, marginBottom: 2 },
  statVal:     { fontSize: 22, fontWeight: "900", color: C.white },
  statLabel:   { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "700" },
  alertBanner: { backgroundColor: C.warningLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.warning, marginBottom: 10 },
  alertText:   { color: C.warningDark, fontWeight: "900", fontSize: 13 },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  gridItem:    { width: "47%" },
  orgDot:      { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  orgName:     { fontSize: 16, fontWeight: "900", color: C.text, marginTop: 8, marginBottom: 4 },
});
