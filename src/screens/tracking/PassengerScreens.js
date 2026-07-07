import React, { useState, useEffect } from "react";
import { Platform, ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import * as Location from "expo-location";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { Card, InfoRow, SectionHeader, Chip, Btn, EmptyState, Avatar, CallBtn } from "../../components/ui/index";
import { TopHeader, SubHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";
import { routeForUser, driverForRoute, childrenForUser, routeStopsForTrip, tripStatusKey } from "../../utils/helpers";
import LiveLocationDetails, { haversineKm, formatDistance, locationText, hasLiveGps } from "../../components/LiveLocationDetails";

// ── Driver Detail Card (collapsible) ─────────────────────────────────────────
function DriverDetailCard({ driver, route, trip }) {
  const [expanded, setExpanded] = useState(false);
  const isLive = trip?.status === "live";
  const gpsOn  = trip?.gpsOn;

  if (!driver) {
    return (
      <Card style={{ marginBottom: 8 }}>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>Driver not assigned yet.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 8, borderLeftWidth: isLive ? 4 : 0, borderLeftColor: C.success }}>
      <TouchableOpacity
        onPress={() => setExpanded((p) => !p)}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Avatar user={driver} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={S.cardTitle}>{driver.name}</Text>
            <Text style={S.muted}>{driver.phone || "No phone"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {isLive && <Chip label="🟢 Live" type="green" />}
          {isLive && gpsOn && <Chip label="📶 GPS" type="teal" />}
          <Text style={{ color: C.muted, fontSize: 16 }}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
          <InfoRow icon="📱" label="Phone"      value={driver.phone || "—"} />
          <InfoRow icon="📧" label="Email"      value={driver.email || "—"} />
          <InfoRow icon="🪪" label="License"    value={driver.license || "—"} />
          <InfoRow icon="⭐" label="Experience" value={driver.experience || "—"} />
          <InfoRow icon="🚌" label="Route"      value={route?.name || "—"} />
          <InfoRow icon="🚍" label="Bus No"     value={route?.busNo || "—"} />
          {isLive && (
            <>
              <InfoRow icon="🟢" label="Trip Status" value="Live" />
              <InfoRow icon="↔️" label="Direction"   value={trip?.direction === "return" ? "Return / Drop" : "Pickup"} />
              <InfoRow icon="📶" label="GPS"         value={gpsOn ? "Active" : "Off"} />
              {(trip?.delayMinutes || 0) > 0 && (
                <InfoRow icon="⏱️" label="Delay" value={`+${trip.delayMinutes} min`} />
              )}
            </>
          )}
          <CallBtn phone={driver.phone} />
        </View>
      )}
    </Card>
  );
}

export function PassengerHomeScreen({ navigation }) {
  const { currentUser, users, routes, trips, orgs } = useApp();
  const route  = routeForUser(currentUser, routes);
  const driver = driverForRoute(route, users);
  const trip   = trips[route?.id];
  const activeStops = routeStopsForTrip(route, trip);
  const org    = orgs.find((o) => o.id === currentUser.orgId);
  const myStatus = trip?.[tripStatusKey(trip)]?.[currentUser.id];
  const isReturn = trip?.direction === "return";
  const myChildren = childrenForUser(currentUser);

  const statusColor = { pickedup: C.success, absent: C.danger, waiting: C.warning };
  const statusLabel = { pickedup: isReturn ? "✅ Dropped Safely" : "✅ Picked Up", absent: "❌ Marked Absent", waiting: isReturn ? "⏳ Waiting for Drop" : "⏳ Waiting for Pickup" };

  const pct = route && trip
    ? Math.min(95, ((trip.currentStopIndex||0) / Math.max(1, activeStops.length-1)) * 100) : 5;

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <TopHeader user={currentUser} onProfilePress={() => navigation.navigate("Profile")} subtitle={org?.name || "Passenger"} />
        {route ? (
          <View style={S.liveCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <View style={S.busIconBox}><Text style={{ fontSize: 28 }}>🚌</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.liveRoute}>{route.name}</Text>
                <Text style={S.liveBus}>{route.busNo}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={S.etaBig}>{trip?.eta ?? "--"}</Text>
                <Text style={S.etaSmall}>min ETA</Text>
              </View>
            </View>
            <View style={S.progressTrack}>
              <View style={[S.progressFill, { width: `${pct}%` }]} />
              <View style={[S.busDot, { left: `${Math.min(88, pct)}%` }]}>
                <Text style={{ fontSize: 14 }}>🚌</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={S.stopLabel}>{activeStops[0]}</Text>
              <Text style={S.stopLabel}>{activeStops[activeStops.length-1]}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700" }}>
                {isReturn ? "Return at" : "At"}: {activeStops[trip?.currentStopIndex||0]}
              </Text>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Chip label={trip?.status === "live" ? "🟢 LIVE" : trip?.status === "completed" ? "✅ Done" : "⚪ Idle"}
                  type={trip?.status === "live" ? "green" : "gray"} />
                <Chip label={isReturn ? "↩️ Return" : "➡️ Pickup"} type={isReturn ? "purple" : "blue"} />
              </View>
            </View>
            {myStatus && (
              <View style={[S.statusPill, { borderColor: statusColor[myStatus]||C.warning, backgroundColor: (statusColor[myStatus]||C.warning)+"22" }]}>
                <Text style={{ color: statusColor[myStatus]||C.warning, fontWeight: "900", fontSize: 13 }}>
                  {statusLabel[myStatus]||"Waiting"}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={S.liveCard}>
            <Text style={S.liveRoute}>No Route Assigned</Text>
            <Text style={S.liveBus}>Contact your organisation admin</Text>
          </View>
        )}
      </View>

      <View style={pageStyles.roundBody}>
        <Btn title="📍  Track Bus Live" color={C.primary} onPress={() => navigation.navigate("Tracking")} />

        <SectionHeader title={currentUser.role === "employee" ? "My Details" : "Children Details"} />
        <Card>
          {(currentUser.role === "school" || currentUser.role === "college") ? (
            <>
              {myChildren.length === 0 ? (
                <Text style={S.muted}>No child added yet. Add from Profile screen.</Text>
              ) : (
                myChildren.map((child, index) => (
                  <View key={child.id} style={S.childMiniCard}>
                    <Text style={S.childMiniTitle}>Child {index + 1}</Text>
                    <InfoRow icon="👦" label="Child Name" value={child.name || "—"} />
                    <InfoRow icon="🏫" label="Class" value={child.className || "—"} />
                    <InfoRow icon="🔢" label="Roll No" value={child.rollNo || "—"} />
                  </View>
                ))
              )}
              <InfoRow icon="📍" label="Pickup Stop" value={currentUser.stop || "—"} />
            </>
          ) : (
            <>
              <InfoRow icon="🏢" label="Organisation" value={currentUser.org        || "—"} />
              <InfoRow icon="💼" label="Department"   value={currentUser.department || "—"} />
              <InfoRow icon="🕐" label="Shift"        value={currentUser.shiftTime  || "—"} />
              <InfoRow icon="📍" label="Pickup Stop"  value={currentUser.stop       || "—"} />
            </>
          )}
        </Card>

        <SectionHeader title="Driver & Bus" />
        <DriverDetailCard driver={driver} route={route} trip={trip} />
      </View>
    </ScrollView>
  );
}

export function TrackingScreen() {
  const { currentUser, users, routes, trips, refreshData } = useApp();
  const route  = routeForUser(currentUser, routes);
  const driver = driverForRoute(route, users);
  const trip   = trips[route?.id];
  const activeStops = routeStopsForTrip(route, trip);
  const isReturn = trip?.direction === "return";
  const liveGps = hasLiveGps(trip);

  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState("checking");

  const myStopIndex = activeStops?.indexOf(currentUser.stop) ?? -1;
  const stopsAway   = myStopIndex >= 0 ? Math.max(0, myStopIndex - (trip?.currentStopIndex||0)) : null;
  const etaToMyStop = stopsAway != null ? stopsAway * 4 : null;
  const directKm = liveGps && userLocation
    ? haversineKm(userLocation.latitude, userLocation.longitude, trip.latitude, trip.longitude)
    : null;
  const estimatedKm = directKm == null && stopsAway != null ? stopsAway * 1.2 : null;

  useEffect(() => {
    if (!currentUser?.id) return;
    refreshData?.(currentUser);
    const timer = setInterval(() => refreshData?.(currentUser), 5000);
    return () => clearInterval(timer);
  }, [currentUser?.id, refreshData]);

  useEffect(() => {
    let subscription;
    let cancelled = false;

    async function startPassengerLocation() {
      if (Platform.OS === "web") {
        setLocationPermission("web-skipped");
        return;
      }
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setLocationPermission("denied");
          return;
        }
        setLocationPermission("granted");
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
        if (!cancelled && current?.coords) setUserLocation(current.coords);
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
          (loc) => loc?.coords && setUserLocation(loc.coords)
        );
      } catch (_) {
        setLocationPermission("unavailable");
      }
    }

    startPassengerLocation();
    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, []);

  if (!route) {
    return (
      <View style={pageStyles.page}>
        <View style={pageStyles.blueTop}><SubHeader title="Live Tracking" subtitle="Bus Location" /></View>
        <View style={pageStyles.roundBody}><EmptyState icon="🚌" title="No route assigned" sub="Contact your admin." /></View>
      </View>
    );
  }

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="Live Tracking" subtitle={`${route.busNo} · ${route.name}`} />
      </View>
      <View style={pageStyles.roundBody}>
        <LiveLocationDetails
          route={route}
          trip={trip}
          activeStops={activeStops}
          userStop={currentUser.stop}
          userLocation={userLocation}
        />

        {(stopsAway != null || directKm != null) && (
          <View style={[S.etaBox, { marginVertical: 10 }]}> 
            <View style={{ flex: 1 }}>
              <Text style={S.etaBoxLabel}>Bus distance to you · {currentUser.stop || "your location"}</Text>
              <Text style={S.etaBoxVal}>
                {stopsAway === 0
                  ? "🚨 Bus is at your stop NOW!"
                  : directKm != null
                  ? `${formatDistance(directKm)} away · GPS based`
                  : `~${formatDistance(estimatedKm)} away · ${stopsAway} stop${stopsAway !== 1 ? "s" : ""}`}
              </Text>
              {locationPermission === "denied" ? (
                <Text style={[S.muted, { marginTop: 3 }]}>Allow location permission to calculate exact distance from you.</Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 32 }}>{stopsAway === 0 ? "🚨" : "🚌"}</Text>
          </View>
        )}

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={S.cardTitle}>{trip?.status === "live" ? "Bus is running" : trip?.status === "completed" ? "Trip completed" : "Trip not started"}</Text>
            <Chip label={trip?.gpsOn ? "GPS ON" : "GPS OFF"} type={trip?.gpsOn ? "green" : "gray"} />
          </View>
          <InfoRow icon="↔️" label="Trip Direction" value={isReturn ? "Return / Drop Route" : "Pickup Route"} />
          <InfoRow icon="🚦" label="Current Stop" value={activeStops[trip?.currentStopIndex||0]} />
          <InfoRow icon="⚡" label="Speed"        value={`${trip?.speed||0} km/h`} />
          <InfoRow icon="📡" label="Live GPS"     value={liveGps ? `${Number(trip.latitude).toFixed(5)}, ${Number(trip.longitude).toFixed(5)}` : "Waiting for driver GPS"} />
          <InfoRow icon="📌" label="Location" value={locationText(trip)} />
          <InfoRow icon="🕐" label="GPS Updated"  value={trip?.locationUpdatedAt ? new Date(trip.locationUpdatedAt).toLocaleTimeString("en-IN") : "—"} />
          <InfoRow icon="⏱️" label="ETA"          value={`${trip?.eta||0} min to destination`} />
          {(trip?.delayMinutes||0) > 0 && <InfoRow icon="⚠️" label="Delay" value={`+${trip.delayMinutes} min`} />}
        </Card>

        <SectionHeader title="Stop Progress" />
        {activeStops.map((stop, i) => {
          const isDone    = trip && i < trip.currentStopIndex;
          const isCurrent = trip && i === trip.currentStopIndex;
          const isMyStop  = stop === currentUser.stop;
          return (
            <View key={i} style={[S.stopRow, isMyStop && { borderColor: C.primary, borderWidth: 1.5 }]}>
              <View style={[S.stopDot, {
                backgroundColor: isDone ? C.success : isCurrent ? C.warning : isMyStop ? C.primary : C.border,
              }]}>
                <Text style={{ color: C.white, fontWeight: "900", fontSize: 12 }}>
                  {isDone ? "✓" : isCurrent ? "🚌" : i+1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.stopName, isMyStop && { color: C.primary }]}>
                  {stop}{isMyStop ? "  📍 Your Stop" : ""}
                </Text>
                <Text style={S.stopSub}>
                  {isDone ? "Passed" : isCurrent ? "Bus is here now" : i === activeStops.length-1 ? "Destination" : "Upcoming"}
                </Text>
              </View>
              {isMyStop && stopsAway != null && (
                <Chip label={stopsAway === 0 ? "Here!" : `${stopsAway} away`} type={stopsAway === 0 ? "green" : "blue"} />
              )}
            </View>
          );
        })}

        <SectionHeader title="Driver" />
        <DriverDetailCard driver={driver} route={route} trip={trip} />
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  liveCard:      { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 14, marginTop: 4 },
  busIconBox:    { width: 50, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  liveRoute:     { color: C.white, fontSize: 16, fontWeight: "900" },
  liveBus:       { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  etaBig:        { color: C.white, fontSize: 30, fontWeight: "900" },
  etaSmall:      { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 6, marginTop: 14, marginBottom: 4, position: "relative" },
  progressFill:  { height: 6, backgroundColor: C.white, borderRadius: 6 },
  busDot:        { position: "absolute", top: -11, width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, borderWidth: 2, borderColor: C.primary, alignItems: "center", justifyContent: "center" },
  stopLabel:     { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" },
  statusPill:    { borderRadius: 10, borderWidth: 1, padding: 8, marginTop: 10, alignItems: "center" },
  cardTitle:     { color: C.text, fontSize: 15, fontWeight: "900" },
  muted:         { color: C.muted, fontSize: 12, fontWeight: "600" },
  childMiniCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, marginBottom: 8 },
  childMiniTitle:{ color: C.text, fontSize: 13, fontWeight: "900", marginBottom: 4 },
  roadH:         { position: "absolute", left: 0, right: 0, height: 7, backgroundColor: C.primaryLight },
  roadV:         { position: "absolute", top: 0, bottom: 0, width: 7, backgroundColor: C.primaryLight },
  livePill:      { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(46,184,114,0.16)", flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.white, marginRight: 4 },
  liveText:      { color: C.white, fontSize: 10, fontWeight: "900" },
  etaBox:        { backgroundColor: C.primaryLight, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center" },
  etaBoxLabel:   { color: C.muted, fontSize: 11, fontWeight: "700" },
  etaBoxVal:     { color: C.primary, fontSize: 14, fontWeight: "900", marginTop: 2 },
  stopRow:       { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  stopDot:       { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
  stopName:      { color: C.text, fontSize: 14, fontWeight: "900" },
  stopSub:       { color: C.muted, fontSize: 11, marginTop: 2 },
});
