import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { appAlert, appConfirm } from "../../utils/alerts";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import {
  Card,
  InfoRow,
  SectionHeader,
  Chip,
  Btn,
  EmptyState,
  LogRow,
} from "../../components/ui/index";
import { TopHeader, SubHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";
import { displayName, childrenForUser, routeReturnStops, routeStopsForTrip, tripStatusKey } from "../../utils/helpers";
import LiveLocationDetails, { locationText, hasLiveGps } from "../../components/LiveLocationDetails";


const PASSENGER_ROLES = ["school", "college", "employee"];

const roleLabel = (role) => {
  if (role === "school") return "Student";
  if (role === "college") return "College";
  if (role === "employee") return "Employee";
  return role || "User";
};

const passengerSubtitle = (p) => {
  if (!p) return "";
  if (p.role === "school" || p.role === "college") {
    const kids = childrenForUser(p);
    const childInfo = kids.length
      ? kids.map((c) => `${c.name || "Child"}${c.className ? ` · ${c.className}` : ""}${c.rollNo ? ` · ${c.rollNo}` : ""}`).join("  •  ")
      : "No child added";
    return `${roleLabel(p.role)} · Parent: ${p.name} · ${childInfo}`;
  }
  return `${roleLabel(p.role)}${p.department ? ` · ${p.department}` : ""}${p.empId ? ` · ${p.empId}` : ""}`;
};

function UserDetailCard({ user, routes }) {
  const route = routes.find((r) => r.id === user.routeId);
  const kids = childrenForUser(user);

  return (
    <Card key={user.id} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={S.name}>{user.name}</Text>
          <Text style={S.muted}>{user.email || "No email"}</Text>
        </View>
        <Chip label={roleLabel(user.role)} type={user.role === "driver" ? "orange" : "purple"} />
      </View>

      <InfoRow icon="📱" label="Phone" value={user.phone || "—"} />
      <InfoRow icon="✅" label="Status" value={user.approved ? "Approved" : "Pending"} />
      <InfoRow icon="🚌" label="Route" value={route?.name || "Not assigned"} />
      <InfoRow icon="📍" label="Pickup Point" value={user.stop || "—"} />

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
          <InfoRow icon="💼" label="Department" value={user.department || "—"} />
          <InfoRow icon="🪪" label="Employee ID" value={user.empId || "—"} />
          <InfoRow icon="⏰" label="Shift" value={user.shiftTime || "—"} />
        </>
      )}

      {user.role === "driver" && (
        <>
          <InfoRow icon="🪪" label="License" value={user.license || "—"} />
          <InfoRow icon="⭐" label="Experience" value={user.experience || "—"} />
        </>
      )}
    </Card>
  );
}

function PickupPeopleList({ route, users, trip, showStatus = false }) {
  const passengers = users.filter((u) => u.routeId === route.id && PASSENGER_ROLES.includes(u.role));
  const pickupStops = route.stops?.slice(0, -1) || [];

  if (passengers.length === 0) {
    return (
      <View style={S.pickupBox}>
        <Text style={S.pickupTitle}>Pickup / Drop People</Text>
        <Text style={S.muted}>No passengers assigned to this route yet.</Text>
      </View>
    );
  }

  return (
    <View style={S.pickupBox}>
      <Text style={S.pickupTitle}>Pickup / Drop People</Text>
      {pickupStops.map((stopName) => {
        const stopPassengers = passengers.filter((p) => p.stop === stopName);
        return (
          <View key={stopName} style={S.pickupStopBlock}>
            <View style={S.pickupStopHeader}>
              <Text style={S.pickupStopName}>📍 {stopName}</Text>
              <Chip label={`${stopPassengers.length}`} type={stopPassengers.length ? "blue" : "gray"} />
            </View>

            {stopPassengers.length === 0 ? (
              <Text style={S.noPassengerText}>No pickup here</Text>
            ) : (
              stopPassengers.map((p) => {
                const statusMap = trip?.[tripStatusKey(trip)] || {};
                const status = statusMap[p.id] || "waiting";
                const statusType = status === "pickedup" ? "green" : status === "absent" ? "red" : "gray";
                const statusText = status === "pickedup" ? (trip?.direction === "return" ? "Dropped" : "Picked") : status === "absent" ? "Absent" : "Waiting";

                return (
                  <View key={p.id} style={S.pickupPersonRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.pickupPersonName}>{displayName(p)}</Text>
                      <Text style={S.pickupPersonSub}>{passengerSubtitle(p)}</Text>
                    </View>
                    {showStatus && <Chip label={statusText} type={statusType} />}
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Admin Home ────────────────────────────────────────────────────────────────
export function AdminHomeScreen({ navigation }) {
  const {
    currentUser,
    orgs,
    users,
    routes,
    trips,
    approvals,
    sosAlerts,
    respondToSos,
    resolveSos,
  } = useApp();

  const org = orgs.find((o) => o.id === currentUser.orgId);
  const orgRoutes = routes.filter((r) => r.orgId === currentUser.orgId);
  const orgUsersList = users.filter(
    (u) => u.orgId === currentUser.orgId && u.role !== "admin"
  );

  const pendingCount = approvals.filter(
    (a) =>
      a.type === "user_request" &&
      a.orgId === currentUser.orgId &&
      a.status === "pending"
  ).length;

  const liveCount = orgRoutes.filter(
    (r) => trips[r.id]?.status === "live"
  ).length;

  const statsConfig = [
    { icon: "🗺️", val: orgRoutes.length, label: "Routes", screen: "AdminRoutes" },
    { icon: "🟢", val: liveCount, label: "Live Now", screen: "AdminRoutes" },
    { icon: "👥", val: orgUsersList.length, label: "Users", screen: "AdminUsers" },
    { icon: "📝", val: pendingCount, label: "Pending", screen: "AdminApprovals" },
  ];

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <TopHeader
          user={currentUser}
          onProfilePress={() => navigation.navigate("Profile")}
          subtitle={org?.name || "Org Admin"}
        />

        <View style={S.statsCard}>
          {statsConfig.map((s) => (
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
        {pendingCount > 0 && (
          <TouchableOpacity
            style={S.alertBanner}
            onPress={() => navigation.navigate("AdminApprovals")}
          >
            <Text style={S.alertText}>
              📝 {pendingCount} user{pendingCount !== 1 ? "s" : ""} waiting for approval →
            </Text>
          </TouchableOpacity>
        )}

        <SectionHeader title="Quick Actions" />

        <View style={S.grid}>
          {[
            { icon: "✅", label: "Approvals", screen: "AdminApprovals", color: C.success },
            { icon: "🚌", label: "Fleet", screen: "AdminFleet", color: C.primary },
            { icon: "👥", label: "Users", screen: "AdminUsers", color: C.primary },
            { icon: "📢", label: "Broadcast", screen: "Broadcast", color: C.orange },
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

        {/* SOS Alerts Section */}
        {(() => {
          const orgSosAlerts = (sosAlerts || []).filter(
            (s) => routes.some((r) => r.orgId === currentUser.orgId && r.id === s.routeId)
          );
          const activeSos = orgSosAlerts.filter((s) => String(s.status || "").toLowerCase() !== "resolved");
          if (orgSosAlerts.length === 0) return null;
          return (
            <>
              <SectionHeader title={`🚨 SOS Alerts${activeSos.length > 0 ? ` (${activeSos.length} active)` : ""}`} />
              {orgSosAlerts.map((sos) => {
                const sender = users.find((u) => u.id === sos.userId || u.id === sos.senderId);
                const isResolved = String(sos.status || "").toLowerCase() === "resolved";
                const sosRoute = routes.find((r) => r.id === sos.routeId);
                return (
                  <Card key={sos.id} style={{ marginBottom: 8, borderLeftWidth: 4, borderLeftColor: isResolved ? C.success : C.danger }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ color: C.text, fontSize: 15, fontWeight: "900" }}>🚨 {sos.type === "driver_sos" ? "Driver SOS" : "Passenger SOS"}</Text>
                      <Chip label={isResolved ? "Resolved" : "Active"} type={isResolved ? "green" : "red"} />
                    </View>
                    <InfoRow icon="👤" label="From"  value={sender?.name || sos.senderName || "Unknown"} />
                    <InfoRow icon="🚌" label="Route" value={sosRoute?.name || "—"} />
                    <InfoRow icon="📍" label="Stop"  value={sender?.stop || "—"} />
                    <InfoRow icon="🕐" label="Time"  value={sos.createdAt || "—"} />
                    {sos.message && <InfoRow icon="💬" label="Message" value={sos.message} />}
                    {!isResolved && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <Btn title="✅ Respond" color={C.warning} onPress={() => respondToSos(sos.id, "Help is on the way. Please stay safe.")} />
                        <Btn title="✔ Resolve" color={C.success} onPress={() => resolveSos(sos.id, "SOS has been resolved.")} />
                      </View>
                    )}
                  </Card>
                );
              })}
            </>
          );
        })()}

        <SectionHeader title="Organisation" />

        <Card>
          <Text style={S.orgName}>{org?.name || "—"}</Text>
          <InfoRow icon="📋" label="Type" value={org?.type || "—"} />
          <InfoRow icon="📍" label="Address" value={org?.address || "—"} />
          <InfoRow icon="📱" label="Phone" value={org?.phone || "—"} />
        </Card>

        <SectionHeader title="Routes Overview" />

        {orgRoutes.length === 0 ? (
          <EmptyState
            icon="🗺️"
            title="No routes yet"
            sub="Go to Routes tab to create your first route."
          />
        ) : (
          orgRoutes.map((route) => {
            const trip = trips[route.id];
            const driver = users.find((u) => u.id === route.driverId);
            return (
              <TouchableOpacity key={route.id} onPress={() => navigation.navigate("AdminRoutes")} activeOpacity={0.8}>
                <Card style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={S.routeName}>{route.name}</Text>
                    <Chip
                      label={trip?.status === "live" ? "🟢 Live" : "Idle"}
                      type={trip?.status === "live" ? "green" : "gray"}
                    />
                  </View>
                  <InfoRow icon="🚌" label="Bus" value={route.busNo} />
                  <InfoRow icon="↔️" label="Trip Direction" value={trip?.direction === "return" ? "Return / Drop" : "Pickup"} />
                  <InfoRow icon="🚗" label="Driver" value={driver?.name || "Not assigned"} />
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ── Admin Approvals ───────────────────────────────────────────────────────────
export function AdminApprovalsScreen() {
  const {
    currentUser,
    approvals,
    routes,
    approveUserRequest,
    rejectRequest,
  } = useApp();

  const pending = approvals.filter(
    (a) =>
      a.type === "user_request" &&
      a.orgId === currentUser.orgId &&
      a.status === "pending"
  );

  const history = approvals.filter(
    (a) =>
      a.type === "user_request" &&
      a.orgId === currentUser.orgId &&
      a.status !== "pending"
  );

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="User Approvals" subtitle={`${pending.length} pending`} />
      </View>

      <View style={pageStyles.roundBody}>
        <SectionHeader title="Pending Requests" />

        {pending.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No pending approvals"
            sub="New user requests will appear here."
          />
        ) : (
          pending.map((item) => {
            const route = routes.find((r) => r.id === item.routeId);

            return (
              <Card key={item.id} style={{ marginBottom: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Chip label={item.role} type="purple" />
                  <Text style={S.timeText}>{item.submitted}</Text>
                </View>

                <Text style={S.name}>{item.name}</Text>

                <InfoRow icon="📱" label="Phone" value={item.phone} />
                <InfoRow icon="📧" label="Email" value={item.email || "—"} />
                <InfoRow icon="🚌" label="Route" value={route?.name || "—"} />
                <InfoRow icon="📍" label="Pickup Point" value={item.stop || "—"} />

                {(item.role === "school" || item.role === "college") &&
                  item.childName && (
                    <>
                      <InfoRow icon="👦" label="Child" value={item.childName} />
                      <InfoRow
                        icon="🏫"
                        label="Class"
                        value={item.childClass || "—"}
                      />
                      <InfoRow
                        icon="🔢"
                        label="Roll"
                        value={item.childRollNo || "—"}
                      />
                    </>
                  )}

                {item.role === "employee" && (
                  <>
                    <InfoRow
                      icon="💼"
                      label="Dept"
                      value={item.department || "—"}
                    />
                    <InfoRow
                      icon="🪪"
                      label="Emp ID"
                      value={item.empId || "—"}
                    />
                  </>
                )}

                {item.role === "driver" && (
                  <InfoRow
                    icon="🪪"
                    label="License"
                    value={item.license || "—"}
                  />
                )}

                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Btn
                    title="✅  Approve"
                    color={C.success}
                    onPress={() => approveUserRequest(item)}
                  />
                  <Btn
                    title="❌  Reject"
                    color={C.danger}
                    onPress={() => rejectRequest(item.id)}
                  />
                </View>
              </Card>
            );
          })
        )}

        <SectionHeader title="History" />

        {history.length === 0 ? (
          <Card>
            <Text style={S.muted}>No history.</Text>
          </Card>
        ) : (
          history.map((item) => (
            <Card key={item.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>
                  {item.status === "approved" ? "✅" : "❌"}
                </Text>

                <View style={{ flex: 1 }}>
                  <Text style={S.orgName}>{item.name}</Text>
                  <Text style={S.muted}>{item.role}</Text>
                </View>

                <Chip
                  label={item.status}
                  type={item.status === "approved" ? "green" : "red"}
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Admin Fleet ───────────────────────────────────────────────────────────────
export function AdminFleetScreen() {
  const { currentUser, users, routes, trips, refreshData } = useApp();

  const orgRoutes = routes.filter((r) => r.orgId === currentUser.orgId);

  useEffect(() => {
    if (!currentUser?.id) return;
    refreshData?.(currentUser);
    const timer = setInterval(() => refreshData?.(currentUser), 5000);
    return () => clearInterval(timer);
  }, [currentUser?.id, refreshData]);

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="Fleet Monitor" subtitle="Live bus status" />
      </View>

      <View style={pageStyles.roundBody}>
        {orgRoutes.length === 0 ? (
          <EmptyState
            icon="🚌"
            title="No routes created yet"
            sub="Create routes first to monitor your fleet."
          />
        ) : (
          orgRoutes.map((route) => {
            const trip = trips[route.id];
            const activeStops = routeStopsForTrip(route, trip);
            const statusMap = trip?.[tripStatusKey(trip)] || {};
            const driver = users.find((u) => u.id === route.driverId);
            const currentStop = activeStops[trip?.currentStopIndex || 0];

            const passengers = users.filter(
              (u) =>
                u.routeId === route.id &&
                ["school", "college", "employee"].includes(u.role)
            );

            const pickedUp = passengers.filter(
              (p) => statusMap[p.id] === "pickedup"
            ).length;

            const absent = passengers.filter(
              (p) => statusMap[p.id] === "absent"
            ).length;

            return (
              <Card key={route.id} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={S.routeName}>{route.name}</Text>

                  <Chip
                    label={
                      trip?.status === "live"
                        ? "🟢 LIVE"
                        : trip?.status === "completed"
                        ? "✅ Done"
                        : "⚪ Idle"
                    }
                    type={trip?.status === "live" ? "green" : "gray"}
                  />
                </View>

                <InfoRow icon="🚌" label="Bus" value={route.busNo} />
                <InfoRow icon="↔️" label="Trip Direction" value={trip?.direction === "return" ? "Return / Drop" : "Pickup"} />
                <InfoRow
                  icon="🚗"
                  label="Driver"
                  value={driver?.name || "Not assigned"}
                />
                <InfoRow icon="📍" label="At Stop" value={currentStop} />
                <InfoRow
                  icon="⚡"
                  label="Speed"
                  value={`${trip?.speed || 0} km/h · ETA ${
                    trip?.eta || 0
                  } min`}
                />
                <InfoRow
                  icon="👥"
                  label={trip?.direction === "return" ? "Drop Status" : "Pickup"}
                  value={`${passengers.length} total · ${pickedUp} ${trip?.direction === "return" ? "dropped" : "picked"} · ${absent} absent`}
                />

                <InfoRow
                  icon="📞"
                  label="Driver Phone"
                  value={driver?.phone || "—"}
                />

                <View style={{ marginTop: 12 }}>
                  <LiveLocationDetails
                    route={route}
                    trip={trip}
                    activeStops={activeStops}
                    compact
                    showDistance={false}
                  />
                </View>

                <InfoRow
                  icon="📌"
                  label="Live Location"
                  value={locationText(trip)}
                />
                <InfoRow
                  icon="📡"
                  label="GPS Status"
                  value={hasLiveGps(trip) ? "Live coordinates available" : "Waiting for driver GPS"}
                />

                {(trip?.delayMinutes || 0) > 0 && (
                  <InfoRow
                    icon="⚠️"
                    label="Delay"
                    value={`+${trip.delayMinutes} min`}
                  />
                )}

                <View
                  style={{
                    flexDirection: "row",
                    gap: 3,
                    marginTop: 12,
                    alignItems: "center",
                  }}
                >
                  {activeStops.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        S.miniDot,
                        {
                          flex: 1,
                          backgroundColor:
                            trip && i < trip.currentStopIndex
                              ? C.success
                              : trip && i === trip.currentStopIndex
                              ? C.warning
                              : C.border,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 3,
                  }}
                >
                  <Text style={[S.muted, { fontSize: 9 }]}>
                    {activeStops[0]}
                  </Text>
                  <Text style={[S.muted, { fontSize: 9 }]}>
                    {activeStops[activeStops.length - 1]}
                  </Text>
                </View>

                <PickupPeopleList route={route} users={users} trip={trip} showStatus />

                {(trip?.logs || []).length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {[...trip.logs].slice(0, 3).map((log, i) => (
                      <LogRow key={i} text={log} />
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ── Admin Routes Management ───────────────────────────────────────────────────
export function AdminRoutesScreen() {
  const {
    currentUser,
    users,
    routes,
    createRoute,
    deleteRoute,
    updateRoute,
    assignUserToRoute,
    removeUserFromRoute,
  } = useApp();

  const orgRoutes = routes.filter((r) => r.orgId === currentUser.orgId);
  const orgDrivers = users.filter(
    (u) => u.orgId === currentUser.orgId && u.role === "driver"
  );
  const orgPassengers = users.filter(
    (u) => u.orgId === currentUser.orgId && PASSENGER_ROLES.includes(u.role)
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [busNo, setBusNo] = useState("");
  const [driverId, setDriverId] = useState("");
  const [stopInput, setStopInput] = useState("");
  const [stops, setStops] = useState([]);
  const [returnStopInput, setReturnStopInput] = useState("");
  const [returnStops, setReturnStops] = useState([]);
  const [editing, setEditing] = useState(null);
  const [managingRouteId, setManagingRouteId] = useState(null);
  const [selectedStops, setSelectedStops] = useState({});

  const addStop = () => {
    const s = stopInput.trim();
    if (!s) return;

    setStops((prev) => [...prev, s]);
    setStopInput("");
  };

  const removeStop = (i) => {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addReturnStop = () => {
    const s = returnStopInput.trim();
    if (!s) return;

    setReturnStops((prev) => [...prev, s]);
    setReturnStopInput("");
  };

  const removeReturnStop = (i) => {
    setReturnStops((prev) => prev.filter((_, idx) => idx !== i));
  };

  const useReverseForReturn = () => {
    setReturnStops([...stops].reverse());
  };

  const resetForm = () => {
    setName("");
    setBusNo("");
    setDriverId("");
    setStops([]);
    setStopInput("");
    setReturnStops([]);
    setReturnStopInput("");
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (route) => {
    setName(route.name || "");
    setBusNo(route.busNo || "");
    setDriverId(route.driverId || "");
    setStops([...(route.stops || [])]);
    setReturnStops([...(route.returnStops || [...(route.stops || [])].reverse())]);
    setEditing(route.id);
    setShowForm(true);
  };

  const submit = () => {
    if (!name || !busNo || stops.length < 2) {
      appAlert(
        "Missing Fields",
        "Fill route name, bus number, and add at least 2 onward stops."
      );
      return;
    }

    const cleanReturnStops = returnStops.filter(Boolean);
    const finalReturnStops = cleanReturnStops.length >= 2 ? cleanReturnStops : [...stops].reverse();

    if (editing) {
      updateRoute(editing, {
        name,
        busNo,
        driverId,
        stops,
        returnStops: finalReturnStops,
      });
      appAlert("Updated ✅", "Route updated.");
    } else {
      createRoute({
        orgId: currentUser.orgId,
        name,
        busNo,
        driverId,
        stops,
        returnStops: finalReturnStops,
        type: "General",
      });
    }

    resetForm();
  };

  const setPassengerStop = (routeId, userId, stopName) => {
    setSelectedStops((prev) => ({ ...prev, [`${routeId}_${userId}`]: stopName }));
  };

  const assignPassenger = (route, passenger) => {
    const pickupStops = route.stops?.slice(0, -1) || [];
    const selectedStop = selectedStops[`${route.id}_${passenger.id}`] || passenger.stop || pickupStops[0] || "";
    const result = assignUserToRoute(passenger.id, route.id, selectedStop);
    if (result?.ok) appAlert("Passenger Added ✅", `${displayName(passenger)} added to ${route.name}.`);
    else appAlert("Unable to Add", result?.msg || "Please try again.");
  };

  const removePassenger = (passenger) => {
    appConfirm(
      "Remove Passenger",
      `Remove ${displayName(passenger)} from this route?`,
      () => {
        const result = removeUserFromRoute(passenger.id);
        if (!result?.ok) appAlert("Unable to Remove", result?.msg || "Please try again.");
      },
      { confirmText: "Remove", destructive: true }
    );
  };

  const renderRouteForm = () => (
    <Card style={{ marginBottom: 10 }}>
      <Text style={S.formTitle}>
        {editing ? "Edit Route" : "New Route"}
      </Text>

      <Text style={S.label}>Route Name</Text>
      <TextInput
        style={S.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. School Route 4B"
        placeholderTextColor={C.mutedLight}
      />

      <Text style={S.label}>Bus / Vehicle Number</Text>
      <TextInput
        style={S.input}
        value={busNo}
        onChangeText={setBusNo}
        placeholder="e.g. KA-01-SC-2026"
        placeholderTextColor={C.mutedLight}
      />

      <Text style={S.label}>Assign Driver</Text>

      {orgDrivers.length === 0 ? (
        <Text style={S.muted}>
          No drivers in your org yet. Approve driver accounts first.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        >
          {orgDrivers.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setDriverId(d.id)}
              style={[
                S.driverPill,
                driverId === d.id && {
                  backgroundColor: C.primary,
                  borderColor: C.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: driverId === d.id ? C.white : C.text,
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                {d.name}
              </Text>
              <Text
                style={{
                  color:
                    driverId === d.id ? C.white : C.muted,
                  fontSize: 11,
                }}
              >
                {d.phone}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={S.label}>Stops (in order)</Text>

      {stops.map((s, i) => (
        <View key={`${s}_${i}`} style={S.stopRow}>
          <Text
            style={{
              flex: 1,
              fontWeight: "700",
              color: C.text,
            }}
          >
            {i + 1}. {s}
            {i === stops.length - 1 ? "  🏁" : ""}
          </Text>

          <TouchableOpacity onPress={() => removeStop(i)}>
            <Text
              style={{
                color: C.danger,
                fontWeight: "900",
                fontSize: 16,
              }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <TextInput
          style={[S.input, { flex: 1 }]}
          value={stopInput}
          onChangeText={setStopInput}
          placeholder="Type stop name…"
          placeholderTextColor={C.mutedLight}
        />

        <Btn
          title="Add"
          onPress={addStop}
          flex={0}
          style={{ paddingHorizontal: 18, marginTop: 0 }}
        />
      </View>

      <Text style={[S.muted, { marginTop: 4 }]}>Add stops in pickup order. Last stop = destination.</Text>

      <Text style={S.label}>Return Route Stops</Text>
      <Text style={S.muted}>Return route is used for evening/drop route. Add manually or auto-fill reverse onward route.</Text>
      <Btn
        title="↩️ Use Reverse Onward Stops"
        color={C.purple}
        small
        onPress={useReverseForReturn}
        style={{ marginTop: 8 }}
      />

      {returnStops.map((s, i) => (
        <View key={`return_${s}_${i}`} style={S.stopRow}>
          <Text
            style={{
              flex: 1,
              fontWeight: "700",
              color: C.text,
            }}
          >
            {i + 1}. {s}
            {i === 0 ? "  🏫 Start" : i === returnStops.length - 1 ? "  🏁 End" : ""}
          </Text>

          <TouchableOpacity onPress={() => removeReturnStop(i)}>
            <Text
              style={{
                color: C.danger,
                fontWeight: "900",
                fontSize: 16,
              }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <TextInput
          style={[S.input, { flex: 1 }]}
          value={returnStopInput}
          onChangeText={setReturnStopInput}
          placeholder="Type return stop name…"
          placeholderTextColor={C.mutedLight}
        />

        <Btn
          title="Add"
          onPress={addReturnStop}
          flex={0}
          style={{ paddingHorizontal: 18, marginTop: 0 }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Btn
          title={editing ? "Update Route" : "Create Route"}
          color={C.success}
          onPress={submit}
        />
        <Btn title="Cancel" color={C.muted} onPress={resetForm} />
      </View>
    </Card>
  );

  const renderPassengerManager = (route) => {
    const pickupStops = route.stops?.slice(0, -1) || [];
    const assigned = orgPassengers.filter((u) => u.routeId === route.id);
    const available = orgPassengers.filter((u) => u.routeId !== route.id);

    return (
      <View style={S.manageBox}>
        <Text style={S.manageTitle}>Manage Passengers</Text>
        <Text style={S.muted}>Add existing approved users to this route or remove wrong assignments.</Text>

        <Text style={S.manageSubTitle}>Assigned to this route</Text>
        {assigned.length === 0 ? (
          <Text style={S.noPassengerText}>No passengers assigned.</Text>
        ) : (
          assigned.map((p) => (
            <View key={p.id} style={S.managePassengerRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.pickupPersonName}>{displayName(p)}</Text>
                <Text style={S.pickupPersonSub}>{passengerSubtitle(p)}</Text>
                <Text style={S.pickupPersonSub}>📍 {p.stop || "Pickup stop not set"}</Text>
              </View>
              <Btn
                title="Remove"
                color={C.danger}
                small
                flex={0}
                style={{ paddingHorizontal: 12 }}
                onPress={() => removePassenger(p)}
              />
            </View>
          ))
        )}

        <Text style={S.manageSubTitle}>Add passenger</Text>
        {available.length === 0 ? (
          <Text style={S.noPassengerText}>No unassigned passengers available in this organisation.</Text>
        ) : (
          available.map((p) => {
            const key = `${route.id}_${p.id}`;
            const selected = selectedStops[key] || p.stop || pickupStops[0] || "";
            return (
              <View key={p.id} style={S.availablePassengerCard}>
                <Text style={S.pickupPersonName}>{displayName(p)}</Text>
                <Text style={S.pickupPersonSub}>{passengerSubtitle(p)}</Text>
                {pickupStops.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {pickupStops.map((stopName) => (
                      <TouchableOpacity
                        key={stopName}
                        onPress={() => setPassengerStop(route.id, p.id, stopName)}
                        style={[S.stopPill, selected === stopName && S.stopPillActive]}
                      >
                        <Text style={[S.stopPillText, selected === stopName && S.stopPillTextActive]}>📍 {stopName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={S.noPassengerText}>Add pickup stops before assigning passengers.</Text>
                )}
                <Btn
                  title="＋ Add to Route"
                  color={C.success}
                  small
                  onPress={() => assignPassenger(route, p)}
                  disabled={pickupStops.length === 0}
                />
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={pageStyles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={pageStyles.blueTop}>
          <SubHeader
            title="Route Management"
            subtitle={`${orgRoutes.length} routes`}
          />
        </View>

        <View style={pageStyles.roundBody}>
          {!showForm ? (
            <Btn title="＋  Create New Route" onPress={openCreate} />
          ) : !editing ? (
            renderRouteForm()
          ) : (
            <Card style={S.editHintCard}>
              <Text style={S.cardTitle}>Editing route below</Text>
              <Text style={S.muted}>The selected route card is opened with edit fields and passenger management.</Text>
              <Btn title="Cancel Edit" color={C.muted} small onPress={resetForm} />
            </Card>
          )}

          <SectionHeader title="Your Routes" />

          {orgRoutes.length === 0 ? (
            <EmptyState
              icon="🗺️"
              title="No routes yet"
              sub="Create your first route above."
            />
          ) : (
            orgRoutes.map((route) => {
              const driver = users.find((u) => u.id === route.driverId);
              const routePassengers = orgPassengers.filter((u) => u.routeId === route.id);
              const isEditingThis = editing === route.id && showForm;
              const isManagingThis = managingRouteId === route.id;

              return (
                <Card key={route.id} style={{ marginBottom: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={S.routeName}>{route.name}</Text>
                    <Chip label={route.busNo} type="blue" />
                  </View>

                  <InfoRow
                    icon="🚗"
                    label="Driver"
                    value={driver?.name || "Not assigned"}
                  />

                  <InfoRow
                    icon="📍"
                    label="Onward Route"
                    value={`${route.stops.length} stops: ${route.stops[0]} → ${
                      route.stops[route.stops.length - 1]
                    }`}
                  />

                  <InfoRow
                    icon="↩️"
                    label="Return Route"
                    value={`${routeReturnStops(route).length} stops: ${routeReturnStops(route)[0]} → ${
                      routeReturnStops(route)[routeReturnStops(route).length - 1]
                    }`}
                  />

                  <InfoRow
                    icon="👥"
                    label="Who will be picked"
                    value={`${routePassengers.length} passenger${routePassengers.length !== 1 ? "s" : ""} assigned`}
                  />

                  <PickupPeopleList route={route} users={users} />

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Btn
                      title={isEditingThis ? "Editing..." : "✏️ Edit"}
                      color={isEditingThis ? C.warning : C.primary}
                      small
                      onPress={() => openEdit(route)}
                    />

                    <Btn
                      title={isManagingThis ? "Hide Passengers" : "👥 Passengers"}
                      color={isManagingThis ? C.muted : C.purple}
                      small
                      onPress={() => setManagingRouteId(isManagingThis ? null : route.id)}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Btn
                      title="🗑️ Delete Route"
                      color={C.danger}
                      small
                      onPress={() =>
                        appConfirm(
                          "Delete Route",
                          `Delete "${route.name}"? Assigned passengers will be unassigned.`,
                          () => deleteRoute(route.id),
                          { confirmText: "Delete", destructive: true }
                        )
                      }
                    />
                  </View>

                  {isEditingThis && renderRouteForm()}
                  {isManagingThis && renderPassengerManager(route)}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


// ── Admin Users Screen ────────────────────────────────────────────────────────
export function AdminUsersScreen({ navigation }) {
  const { currentUser, users, routes, trips } = useApp();
  const [userSearch, setUserSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedDriverId, setExpandedDriverId] = useState(null);

  const orgDriversList = users.filter(
    (u) => u.orgId === currentUser.orgId && u.role === "driver"
  );

  const orgPassengersList = users.filter(
    (u) => u.orgId === currentUser.orgId && !["admin", "driver"].includes(u.role)
  );

  const filteredUsers = orgPassengersList.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q)
    );
  });

  const filteredDrivers = orgDriversList.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q)
    );
  });

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader
          title="Users"
          subtitle={`${orgDriversList.length} drivers · ${orgPassengersList.length} passengers`}
        />
      </View>
      <View style={pageStyles.roundBody}>
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

        {/* Drivers Section */}
        <SectionHeader title={`🚗 Drivers (${orgDriversList.length})`} />
        {filteredDrivers.length === 0 ? (
          <EmptyState icon="🚗" title="No drivers found" sub="Approved drivers will appear here." />
        ) : filteredDrivers.map((driver) => {
          const isExpanded = expandedDriverId === driver.id;
          const driverRoute = routes.find((r) => r.driverId === driver.id);
          const trip = driverRoute ? trips[driverRoute.id] : null;
          const isLive = trip?.status === "live";
          const gpsOn = trip?.gpsOn;

          return (
            <Card key={driver.id} style={{ marginBottom: 8, borderLeftWidth: isLive ? 4 : 0, borderLeftColor: C.success }}>
              <TouchableOpacity
                onPress={() => setExpandedDriverId(isExpanded ? null : driver.id)}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={S.name}>{driver.name}</Text>
                  <Text style={S.muted}>{driver.phone || "No phone"}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {isLive && <Chip label="🟢 Live" type="green" />}
                  {isLive && gpsOn && <Chip label="📶 GPS" type="teal" />}
                  <Chip label="Driver" type="orange" />
                  <Text style={{ color: C.muted, fontSize: 16 }}>{isExpanded ? "▲" : "▼"}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
                  <InfoRow icon="📧" label="Email"      value={driver.email || "—"} />
                  <InfoRow icon="📱" label="Phone"      value={driver.phone || "—"} />
                  <InfoRow icon="✅" label="Status"     value={driver.approved ? "Approved" : "Pending"} />
                  <InfoRow icon="🪪" label="License"    value={driver.license || "—"} />
                  <InfoRow icon="⭐" label="Experience" value={driver.experience || "—"} />
                  <InfoRow icon="🚌" label="Route"      value={driverRoute?.name || "Not assigned"} />
                  <InfoRow icon="🚍" label="Bus No"     value={driverRoute?.busNo || "—"} />
                  {isLive && (
                    <>
                      <InfoRow icon="🟢" label="Trip Status"   value="Live" />
                      <InfoRow icon="↔️" label="Direction"     value={trip?.direction === "return" ? "Return / Drop" : "Pickup"} />
                      <InfoRow icon="📶" label="GPS"           value={gpsOn ? "Active" : "Off"} />
                      {(trip?.delayMinutes || 0) > 0 && (
                        <InfoRow icon="⏱️" label="Delay" value={`+${trip.delayMinutes} min`} />
                      )}
                    </>
                  )}
                </View>
              )}
            </Card>
          );
        })}

        {/* Passengers Section */}
        <SectionHeader title={`👥 Passengers (${orgPassengersList.length})`} />
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon="👥"
            title={userSearch ? "No results found" : "No passengers yet"}
            sub={userSearch ? "Try a different name or phone number." : "Approved passengers will appear here."}
          />
        ) : (
          filteredUsers.map((user) => {
            const isExpanded = expandedUserId === user.id;
            const route = routes.find((r) => r.id === user.routeId);
            const kids = childrenForUser(user);
            return (
              <Card key={user.id} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={S.name}>{user.name}</Text>
                    <Text style={S.muted}>{user.phone || "No phone"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Chip label={roleLabel(user.role)} type="purple" />
                    <Text style={{ color: C.muted, fontSize: 16 }}>{isExpanded ? "▲" : "▼"}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
                    <InfoRow icon="📧" label="Email"        value={user.email || "—"} />
                    <InfoRow icon="📱" label="Phone"        value={user.phone || "—"} />
                    <InfoRow icon="✅" label="Status"       value={user.approved ? "Approved" : "Pending"} />
                    <InfoRow icon="🚌" label="Route"        value={route?.name || "Not assigned"} />
                    <InfoRow icon="📍" label="Pickup Point" value={user.stop || "—"} />
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
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  statsCard: {
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    flexDirection: "row",
    padding: 12,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 22,
    fontWeight: "900",
    color: C.white,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
  },
  alertBanner: {
    backgroundColor: C.warningLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.warning,
    marginBottom: 10,
  },
  alertText: {
    color: C.warningDark,
    fontWeight: "900",
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  gridItem: {
    width: "47%",
  },
  orgName: {
    fontSize: 16,
    fontWeight: "900",
    color: C.text,
  },
  routeName: {
    fontSize: 15,
    fontWeight: "900",
    color: C.text,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: C.text,
    marginTop: 8,
    marginBottom: 4,
  },
  muted: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  timeText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  miniDot: {
    height: 6,
    borderRadius: 3,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: C.text,
    marginBottom: 8,
  },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
  },
  driverPill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginRight: 8,
    minWidth: 130,
    backgroundColor: C.card,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  pickupBox: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginTop: 10,
  },
  pickupTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  pickupStopBlock: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 9,
    marginBottom: 8,
  },
  pickupStopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pickupStopName: {
    color: C.text,
    fontSize: 12,
    fontWeight: "900",
    flex: 1,
  },
  pickupPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 7,
    marginTop: 6,
    gap: 8,
  },
  pickupPersonName: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
  },
  pickupPersonSub: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  noPassengerText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  editHintCard: {
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  manageBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginTop: 10,
  },
  manageTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
  },
  manageSubTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  managePassengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 9,
    marginBottom: 7,
  },
  availablePassengerCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 8,
  },
  stopPill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: C.bg,
  },
  stopPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  stopPillText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
  },
  stopPillTextActive: {
    color: C.white,
  },
});