import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Vibration, Linking } from "react-native";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { Card, InfoRow, SectionHeader, Chip, Btn, EmptyState, LogRow, SwitchRow, Avatar } from "../../components/ui/index";
import { TopHeader, SubHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";
import { routeForUser, passengersAtStop, passengersOnRoute, displayName, routeStopsForTrip, tripStatusKey } from "../../utils/helpers";
import { appAlert } from "../../utils/alerts";
import { startDriverLocationTracking, stopDriverLocationTracking, sendDriverLocationOnce } from "../../services/locationTracking";

const directionLabel = (trip) => trip?.direction === "return" ? "Return / Drop" : "Pickup";
const statusText = (status, isReturn = false) => {
  if (status === "pickedup") return isReturn ? "✅ Dropped" : "✅ Picked Up";
  if (status === "absent") return "❌ Absent";
  return "⏳ Waiting";
};
const statusChipType = (status) => status === "pickedup" ? "green" : status === "absent" ? "red" : "yellow";

export function DriverHomeScreen({ navigation }) {
  const { currentUser, users, routes, trips } = useApp();
  const route = routeForUser(currentUser, routes);
  const trip  = trips[route?.id];
  const activeStops = routeStopsForTrip(route, trip);
  const pct   = route && trip ? Math.min(95, ((trip.currentStopIndex||0) / Math.max(1, activeStops.length-1)) * 100) : 5;

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <TopHeader user={currentUser} onProfilePress={() => navigation.navigate("Profile")} subtitle="Driver" />
        {route && (
          <View style={S.liveCard}>
            <Text style={S.liveRoute}>{route.name}</Text>
            <Text style={S.liveBus}>{route.busNo}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
              <Chip label={trip?.status === "live" ? "🟢 LIVE" : trip?.status === "completed" ? "✅ Done" : "⚪ Not Started"}
                type={trip?.status === "live" ? "green" : "gray"} />
              <Chip label={directionLabel(trip)} type={trip?.direction === "return" ? "purple" : "blue"} />
              <Chip label={trip?.gpsOn ? "📶 GPS ON" : "📵 GPS OFF"} type={trip?.gpsOn ? "teal" : "gray"} />
              {(trip?.delayMinutes||0) > 0 && <Chip label={`+${trip.delayMinutes} min delay`} type="yellow" />}
            </View>
            <View style={S.progressTrack}>
              <View style={[S.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={S.currentStop}>At: {activeStops[trip?.currentStopIndex||0] || "—"}</Text>
          </View>
        )}
      </View>
      <View style={pageStyles.roundBody}>
        <Btn title="🚗  Open Trip Controls" color={C.success} onPress={() => navigation.navigate("DriverTrip")} />
        <SectionHeader title="Today's Info" />
        <Card>
          <InfoRow icon="🚌" label="Assigned Bus"  value={route?.busNo || "Not assigned"} />
          <InfoRow icon="🗺️" label="Route"         value={route?.name  || "Not assigned"} />
          <InfoRow icon="↔️" label="Trip Type"     value={directionLabel(trip)} />
          <InfoRow icon="📍" label="Current Stop"  value={route ? activeStops[trip?.currentStopIndex||0] : "—"} />
          <InfoRow icon="👥" label="Passengers"    value={`${passengersOnRoute(route?.id, users).length} assigned`} />
          <InfoRow icon="📶" label="GPS"           value={trip?.gpsOn ? "ON — Passengers can track" : "OFF"} />
        </Card>
      </View>
    </ScrollView>
  );
}

export function DriverTripScreen() {
  const { currentUser, users, routes, trips, startTrip, endTrip, nextStop, markPickedup, markAbsent, editPickupStatus, sendDelay, toggleGps, sendDriverSos, sosAlerts, respondToSos, resolveSos } = useApp();
  const route       = routeForUser(currentUser, routes);
  const trip        = trips[route?.id];
  const activeStops = routeStopsForTrip(route, trip);
  const activeSosAlerts = (sosAlerts || []).filter((s) => s.routeId === route?.id);
  const statusMap   = trip?.[tripStatusKey(trip)] || {};
  const isReturn    = trip?.direction === "return";
  const isLive      = trip?.status === "live";
  const currentStop = activeStops?.[trip?.currentStopIndex||0] || "—";
  const atLastStop  = route && trip && trip.currentStopIndex >= activeStops.length - 1;
  const atStopNow   = passengersAtStop(route?.id, currentStop, users);
  const trackerRef  = useRef(null);
  const [gpsStatus, setGpsStatus] = useState("GPS tracker idle");
  const [lastGpsTime, setLastGpsTime] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function syncTracker() {
      if (!route?.id) return;

      if (isLive && trip?.gpsOn) {
        if (trackerRef.current) return;
        try {
          setGpsStatus("Starting live GPS tracker...");
          trackerRef.current = await startDriverLocationTracking(route.id, () => {
            if (!cancelled) {
              setGpsStatus("Live GPS tracking active");
              setLastGpsTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
            }
          });
          await sendDriverLocationOnce(route.id).catch(() => null);
          if (!cancelled) setGpsStatus("Live GPS tracking active");
        } catch (error) {
          if (!cancelled) {
            setGpsStatus("GPS permission needed");
            appAlert("GPS Permission Required", error?.message || "Please allow location permission for live bus tracking.");
          }
        }
      } else {
        if (trackerRef.current) {
          trackerRef.current.removeForeground?.();
          trackerRef.current = null;
        }
        await stopDriverLocationTracking().catch(() => null);
        if (!cancelled) setGpsStatus(isLive ? "GPS sharing is OFF" : "Start trip to enable GPS");
      }
    }

    syncTracker();

    return () => {
      cancelled = true;
      // Keep APK background tracking running while trip is live. Only remove foreground watcher on screen unmount.
      trackerRef.current?.removeForeground?.();
      trackerRef.current = null;
    };
  }, [route?.id, isLive, trip?.gpsOn]);

  if (!route) {
    return (
      <View style={pageStyles.page}>
        <View style={pageStyles.blueTop}><SubHeader title="Trip Controls" subtitle="Driver" /></View>
        <View style={pageStyles.roundBody}><EmptyState icon="🚌" title="No route assigned" sub="Contact your admin to assign a route." /></View>
      </View>
    );
  }

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="Trip Controls" subtitle={`${route.busNo} · ${route.name}`} />
      </View>
      <View style={pageStyles.roundBody}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Text style={S.cardTitle}>{route.name}</Text>
            <Chip label={isLive ? "🟢 LIVE" : trip?.status === "completed" ? "✅ Done" : "⚪ Idle"}
              type={isLive ? "green" : "gray"} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <Chip label={directionLabel(trip)} type={isReturn ? "purple" : "blue"} />
            <Chip label={trip?.gpsOn ? "GPS ON" : "GPS OFF"} type={trip?.gpsOn ? "green" : "gray"} />
          </View>
          <InfoRow icon="📍" label="Current Stop" value={`${currentStop}  (${(trip?.currentStopIndex||0)+1}/${activeStops.length})`} />
          <InfoRow icon="⏱️" label="ETA"          value={`${trip?.eta||0} min`} />
          {(trip?.delayMinutes||0) > 0 && <InfoRow icon="⚠️" label="Delay" value={`+${trip.delayMinutes} min reported`} />}
        </Card>

        <Card>
          <SwitchRow
            title="Live GPS Sharing"
            sub={trip?.gpsOn ? "Passengers & admin are tracking" : "GPS is off"}
            value={!!trip?.gpsOn}
            onChange={() => toggleGps(route.id)} />
          <View style={S.gpsBox}>
            <Text style={S.gpsTitle}>📡 {gpsStatus}</Text>
            <Text style={S.muted}>Location updates are sent every few seconds while trip is live and GPS is ON.</Text>
            {lastGpsTime ? <Text style={S.gpsTime}>Last GPS update: {lastGpsTime}</Text> : null}
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn title="▶️ Pickup Trip" color={C.success} disabled={isLive} onPress={() => startTrip(route.id, "pickup")} />
          <Btn title="↩️ Return Trip" color={C.purple} disabled={isLive} onPress={() => startTrip(route.id, "return")} />
        </View>
        <Btn title="🏁  End Trip" color={C.danger} disabled={!isLive} onPress={() => endTrip(route.id)} />

        <SectionHeader title={`👥 At Stop: ${currentStop}`} />
        {!isLive && (
          <Card style={S.tripLockedCard}>
            <Text style={S.tripLockedTitle}>▶️ Start trip first</Text>
            <Text style={S.tripLockedText}>Pickup, drop, absent and edit-status buttons are enabled only after the trip is live.</Text>
          </Card>
        )}
        {atStopNow.length === 0 ? (
          <EmptyState icon="👍" title="No passengers at this stop" sub="All accounted for or no one assigned here." />
        ) : atStopNow.map((p) => {
          const status  = statusMap[p.id] || "waiting";
          const dName   = displayName(p);
          const subLine = (p.role === "school" || p.role === "college")
            ? `Parent: ${p.name} · ${p.childClass}` : `${p.department||""} · ${p.empId||""}`;
          return (
            <Card key={p.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Avatar user={p} size={44} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={S.cardTitle}>{dName}</Text>
                  <Text style={S.muted}>{subLine}</Text>
                  <Chip label={statusText(status, isReturn)} type={statusChipType(status)} />
                </View>
              </View>

              {!isLive ? (
                <View style={S.editStatusBox}>
                  <Text style={S.editStatusTitle}>Trip not started</Text>
                  <Text style={S.muted}>Start the trip first to mark pickup/drop, absent, or edit passenger status.</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                    <Btn title="📞 Call" color={C.primary} small flex={0.55}
                      onPress={() => p.phone && Linking.openURL(`tel:${p.phone}`)} />
                  </View>
                </View>
              ) : status === "waiting" ? (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                  <Btn title={isReturn ? "✅ Dropped" : "✅ Picked Up"} color={C.success} small onPress={() => markPickedup(route.id, p.id)} />
                  <Btn title="📞 Call" color={C.primary} small flex={0.55}
                    onPress={() => p.phone && Linking.openURL(`tel:${p.phone}`)} />
                  <Btn title="❌ Absent" color={C.danger} small onPress={() => markAbsent(route.id, p.id)} />
                </View>
              ) : (
                <View style={S.editStatusBox}>
                  <Text style={S.editStatusTitle}>Edit status if tapped by mistake</Text>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    <Btn title="↺ Waiting" color={C.warning} small onPress={() => editPickupStatus(route.id, p.id, "waiting")} />
                    <Btn title={isReturn ? "✅ Dropped" : "✅ Picked"} color={C.success} small onPress={() => editPickupStatus(route.id, p.id, "pickedup")} />
                    <Btn title="❌ Absent" color={C.danger} small onPress={() => editPickupStatus(route.id, p.id, "absent")} />
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        {isLive && (
          <>
            <SectionHeader title="Navigation" />
            {!atLastStop ? (
              <Btn title={`➡️  Next Stop: ${activeStops[(trip?.currentStopIndex||0)+1]}`} color={C.primary} onPress={() => nextStop(route.id)} />
            ) : (
              <Btn title="🏁  Reached Destination" color={C.successDark} onPress={() => endTrip(route.id)} />
            )}
            <Btn title="⚠️  Report +10 Min Delay" color={C.warning} onPress={() => sendDelay(route.id)} />
          </>
        )}

        <SectionHeader title="All Passengers" />
        {passengersOnRoute(route.id, users).map((p) => {
          const status = statusMap[p.id] || "waiting";
          return (
            <View key={p.id} style={[S.passengerRow, { opacity: status === "absent" ? 0.6 : 1 }]}>
              <Avatar user={p} size={36} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[S.cardTitle, { fontSize: 13 }]}>{displayName(p)}</Text>
                <Text style={[S.muted, { fontSize: 11 }]}>{p.stop}</Text>
              </View>
              <Chip label={statusText(status, isReturn)} type={statusChipType(status)} />
            </View>
          );
        })}

        <SectionHeader title="Trip Logs" />
        {(trip?.logs||[]).length === 0 ? (
          <Card><Text style={S.muted}>No logs yet. Start the trip to begin logging.</Text></Card>
        ) : [...(trip.logs)].slice(0, 20).map((log, i) => <LogRow key={i} text={log} />)}

        <SectionHeader title="🚨 Passenger SOS Alerts" />
        {activeSosAlerts.length === 0 ? (
          <Card><Text style={S.muted}>No active SOS alerts from passengers.</Text></Card>
        ) : activeSosAlerts.map((sos) => {
          const sender = users.find((u) => u.id === sos.userId || u.id === sos.senderId);
          const isResolved = String(sos.status || "").toLowerCase() === "resolved";
          return (
            <Card key={sos.id} style={{ marginBottom: 8, borderLeftWidth: 4, borderLeftColor: isResolved ? C.success : C.danger }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: "900" }}>🚨 {sos.type === "driver_sos" ? "Driver SOS" : "Passenger SOS"}</Text>
                <Chip label={isResolved ? "Resolved" : "Active"} type={isResolved ? "green" : "red"} />
              </View>
              <InfoRow icon="👤" label="From"   value={sender?.name || sos.senderName || "Unknown"} />
              <InfoRow icon="📍" label="Stop"   value={sender?.stop || "—"} />
              <InfoRow icon="🕐" label="Time"   value={sos.createdAt || "—"} />
              {sos.message && <InfoRow icon="💬" label="Message" value={sos.message} />}
              {!isResolved && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Btn title="✅ Respond" color={C.warning} onPress={() => respondToSos(sos.id, "Help is on the way.")} />
                  <Btn title="✔ Resolve" color={C.success} onPress={() => resolveSos(sos.id, "SOS resolved.")} />
                </View>
              )}
            </Card>
          );
        })}

        <SectionHeader title="Emergency" />
        <Btn title="🚨  Driver Emergency SOS" color={C.dangerDark}
          onPress={() => { Vibration.vibrate(400); sendDriverSos(route.id); }} />
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  liveCard:      { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 14, marginTop: 4 },
  liveRoute:     { color: C.white, fontSize: 16, fontWeight: "900" },
  liveBus:       { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 6, marginTop: 12 },
  progressFill:  { height: 6, backgroundColor: C.white, borderRadius: 6 },
  currentStop:   { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 6, fontWeight: "700" },
  cardTitle:     { color: C.text, fontSize: 15, fontWeight: "900" },
  muted:         { color: C.muted, fontSize: 12, fontWeight: "600" },
  passengerRow:  { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  editStatusBox: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10, marginTop: 10 },
  editStatusTitle: { color: C.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 },
  tripLockedCard: { borderLeftWidth: 4, borderLeftColor: C.warning, marginBottom: 10 },
  tripLockedTitle: { color: C.text, fontSize: 14, fontWeight: "900", marginBottom: 4 },
  tripLockedText: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  gpsBox: { marginTop: 10, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10 },
  gpsTitle: { color: C.text, fontSize: 13, fontWeight: "900", marginBottom: 4 },
  gpsTime: { color: C.success, fontSize: 11, fontWeight: "900", marginTop: 6 },
});
