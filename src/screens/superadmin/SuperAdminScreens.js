import React, { useState } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { Card, InfoRow, SectionHeader, Chip, Btn, EmptyState } from "../../components/ui/index";
import { SubHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";
import { childrenForUser } from "../../utils/helpers";

const roleLabel = (role) => {
  if (role === "school") return "Student";
  if (role === "college") return "College";
  if (role === "employee") return "Employee";
  if (role === "driver") return "Driver";
  return role || "User";
};

export function SuperApprovalsScreen() {
  const { approvals, approveAdminRequest, rejectRequest } = useApp();
  const pending = approvals.filter((a) => a.type === "admin_request" && a.status === "pending");
  const history = approvals.filter((a) => a.type === "admin_request" && a.status !== "pending");

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="Organisation Approvals" subtitle={`${pending.length} pending`} />
      </View>
      <View style={pageStyles.roundBody}>
        <SectionHeader title="Pending Organisation Requests" />
        {pending.length === 0 ? (
          <EmptyState icon="✅" title="All clear!" sub="No pending organisation requests." />
        ) : pending.map((item) => (
          <Card key={item.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Chip label="Org Admin Request" type="orange" />
              <Text style={S.timeText}>{item.submitted}</Text>
            </View>
            <Text style={S.name}>{item.name}</Text>
            <InfoRow icon="🏢" label="Organisation" value={item.orgName} />
            <InfoRow icon="📋" label="Type"         value={item.orgType} />
            <InfoRow icon="📍" label="Address"      value={item.orgAddress || "—"} />
            <InfoRow icon="📱" label="Phone"        value={item.phone} />
            <InfoRow icon="📧" label="Email"        value={item.email || "—"} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Btn title="✅  Approve" color={C.success} onPress={() => approveAdminRequest(item)} />
              <Btn title="❌  Reject"  color={C.danger}  onPress={() => rejectRequest(item.id)} />
            </View>
          </Card>
        ))}

        <SectionHeader title="History" />
        {history.length === 0 ? (
          <Card><Text style={S.muted}>No history yet.</Text></Card>
        ) : history.map((item) => (
          <Card key={item.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>{item.status === "approved" ? "✅" : "❌"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.orgName}>{item.orgName}</Text>
                <Text style={S.muted}>{item.name} · {item.orgType}</Text>
              </View>
              <Chip label={item.status} type={item.status === "approved" ? "green" : "red"} />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

export function SuperOrgsScreen() {
  const { orgs, users, routes, trips } = useApp();
  const [orgSearch, setOrgSearch] = useState("");
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  const filteredOrgs = orgs.filter((o) => {
    const q = orgSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (o.name || "").toLowerCase().includes(q) ||
      (o.type || "").toLowerCase().includes(q) ||
      (o.address || "").toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="All Organisations" subtitle={`${orgs.length} registered`} />
      </View>
      <View style={pageStyles.roundBody}>

        {/* Search bar for orgs */}
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search organisation by name or type..."
            placeholderTextColor={C.muted}
            value={orgSearch}
            onChangeText={setOrgSearch}
          />
          {orgSearch.length > 0 && (
            <TouchableOpacity onPress={() => setOrgSearch("")}>
              <Text style={{ color: C.muted, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredOrgs.length === 0 ? (
          <EmptyState icon="🏢" title="No organisations found" />
        ) : filteredOrgs.map((org) => {
          const admin      = users.find((u) => u.id === org.adminId);
          const orgRoutes  = routes.filter((r) => r.orgId === org.id);
          const orgUsers   = users.filter((u) => u.orgId === org.id && u.role !== "admin");
          const orgDrivers = users.filter((u) => u.orgId === org.id && u.role === "driver");
          const liveCount  = orgRoutes.filter((r) => trips[r.id]?.status === "live").length;
          const isExpanded = expandedOrgId === org.id;

          const filteredOrgUsers = orgUsers.filter((u) => {
            const q = userSearch.toLowerCase().trim();
            if (!q || expandedOrgId !== org.id) return true;
            return (
              (u.name || "").toLowerCase().includes(q) ||
              (u.phone || "").includes(q)
            );
          });

          return (
            <Card key={org.id} style={{ marginBottom: 12 }}>
              {/* Org header - tappable to expand */}
              <TouchableOpacity
                onPress={() => {
                  setExpandedOrgId(isExpanded ? null : org.id);
                  setUserSearch("");
                  setExpandedUserId(null);
                }}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[S.orgColorBar, { backgroundColor: org.color || C.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.orgName}>{org.name}</Text>
                    <Text style={S.muted}>{org.type} · {org.address}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Chip label={liveCount > 0 ? `${liveCount} Live` : "Idle"} type={liveCount > 0 ? "green" : "gray"} />
                  <Text style={{ color: C.muted, fontSize: 16 }}>{isExpanded ? "▲" : "▼"}</Text>
                </View>
              </TouchableOpacity>

              {/* Summary always visible */}
              <View style={{ marginTop: 8 }}>
                <InfoRow icon="👤" label="Admin"   value={admin?.name || "—"} />
                <InfoRow icon="📱" label="Phone"   value={org.phone || "—"} />
                <InfoRow icon="🗺️" label="Routes"  value={`${orgRoutes.length} routes`} />
                <InfoRow icon="🚗" label="Drivers" value={`${orgDrivers.length} drivers`} />
                <InfoRow icon="👥" label="Users"   value={`${orgUsers.length} passengers`} />
              </View>

              {/* Expanded users section */}
              {isExpanded && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: "900", marginBottom: 8 }}>
                    👥 Users Under This Organisation
                  </Text>

                  {/* User search */}
                  <View style={S.searchBox}>
                    <Text style={S.searchIcon}>🔍</Text>
                    <TextInput
                      style={S.searchInput}
                      placeholder="Search by name or phone..."
                      placeholderTextColor={C.muted}
                      value={userSearch}
                      onChangeText={setUserSearch}
                    />
                    {userSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setUserSearch("")}>
                        <Text style={{ color: C.muted, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredOrgUsers.length === 0 ? (
                    <Text style={[S.muted, { textAlign: "center", padding: 12 }]}>
                      {userSearch ? "No users match your search." : "No users in this organisation."}
                    </Text>
                  ) : filteredOrgUsers.map((user) => {
                    const isUserExpanded = expandedUserId === user.id;
                    const userRoute = routes.find((r) => r.id === user.routeId);
                    const kids = childrenForUser(user);
                    return (
                      <Card key={user.id} style={{ marginBottom: 8, backgroundColor: C.surface }}>
                        <TouchableOpacity
                          onPress={() => setExpandedUserId(isUserExpanded ? null : user.id)}
                          activeOpacity={0.7}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 14, fontWeight: "900" }}>{user.name}</Text>
                            <Text style={S.muted}>{user.phone || "No phone"}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Chip label={roleLabel(user.role)} type={user.role === "driver" ? "orange" : "purple"} />
                            <Text style={{ color: C.muted, fontSize: 14 }}>{isUserExpanded ? "▲" : "▼"}</Text>
                          </View>
                        </TouchableOpacity>

                        {isUserExpanded && (
                          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 }}>
                            <InfoRow icon="📧" label="Email"  value={user.email || "—"} />
                            <InfoRow icon="📱" label="Phone"  value={user.phone || "—"} />
                            <InfoRow icon="✅" label="Status" value={user.approved ? "Approved" : "Pending"} />
                            <InfoRow icon="🚌" label="Route"  value={userRoute?.name || "Not assigned"} />
                            <InfoRow icon="📍" label="Stop"   value={user.stop || "—"} />
                            {(user.role === "school" || user.role === "college") && (
                              <>
                                <InfoRow icon="👦" label="Children" value={kids.length ? `${kids.length}` : "—"} />
                                {kids.slice(0, 3).map((child, index) => (
                                  <InfoRow
                                    key={child.id || index}
                                    icon="🏫"
                                    label={`Child ${index + 1}`}
                                    value={`${child.name || "Child"}${child.className ? ` · ${child.className}` : ""}${child.rollNo ? ` · ${child.rollNo}` : ""}`}
                                  />
                                ))}
                              </>
                            )}
                            {user.role === "employee" && (
                              <>
                                <InfoRow icon="💼" label="Department"  value={user.department || "—"} />
                                <InfoRow icon="🪪" label="Employee ID" value={user.empId || "—"} />
                                <InfoRow icon="⏰" label="Shift"       value={user.shiftTime || "—"} />
                              </>
                            )}
                            {user.role === "driver" && (
                              <>
                                <InfoRow icon="🪪" label="License"    value={user.license || "—"} />
                                <InfoRow icon="⭐" label="Experience" value={user.experience || "—"} />
                              </>
                            )}
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  name:        { fontSize: 18, fontWeight: "900", color: C.text, marginTop: 8, marginBottom: 4 },
  orgName:     { fontSize: 15, fontWeight: "900", color: C.text },
  muted:       { color: C.muted, fontSize: 12, fontWeight: "600" },
  timeText:    { color: C.muted, fontSize: 11, fontWeight: "700" },
  orgColorBar: { width: 5, height: 44, borderRadius: 3, marginRight: 10 },
  searchBox:   { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, marginBottom: 10 },
  searchIcon:  { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, color: C.text, fontSize: 14, fontWeight: "700", paddingVertical: 10 },
});
