import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { C } from "../constants/theme";

export function hasLiveGps(trip) {
  return !!(trip?.gpsOn && Number.isFinite(Number(trip?.latitude)) && Number.isFinite(Number(trip?.longitude)));
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const a1 = Number(lat1);
  const o1 = Number(lon1);
  const a2 = Number(lat2);
  const o2 = Number(lon2);
  if (![a1, o1, a2, o2].every(Number.isFinite)) return null;
  const R = 6371;
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLon = ((o2 - o1) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2) * Math.sin(dLat / 2);
  const s2 = Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return R * c;
}

export function formatDistance(km) {
  const value = Number(km);
  if (!Number.isFinite(value)) return "—";
  if (value < 1) return `${Math.max(20, Math.round(value * 1000))} m`;
  return `${value.toFixed(value >= 10 ? 0 : 1)} km`;
}

export function formatGpsTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (_) {
    return "—";
  }
}

export function locationText(trip) {
  return (
    trip?.locationAddress ||
    trip?.locationLabel ||
    [trip?.locationCity, trip?.locationRegion].filter(Boolean).join(", ") ||
    (hasLiveGps(trip) ? `${Number(trip.latitude).toFixed(5)}, ${Number(trip.longitude).toFixed(5)}` : "Waiting for driver GPS")
  );
}

function currentStopLabel(stops = [], trip = {}) {
  const index = Number(trip?.currentStopIndex || 0);
  return stops[index] || stops[0] || "—";
}

function nextStopLabel(stops = [], trip = {}) {
  const index = Number(trip?.currentStopIndex || 0) + 1;
  return stops[index] || "Final stop";
}

export default function LiveLocationDetails({
  route,
  trip,
  activeStops = [],
  userStop = "",
  userLocation,
  showDistance = true,
}) {
  const stops = activeStops?.length ? activeStops : route?.stops || [];
  const live = hasLiveGps(trip);
  const currentStop = currentStopLabel(stops, trip);
  const nextStop = nextStopLabel(stops, trip);
  const userStopIndex = userStop ? stops.indexOf(userStop) : -1;
  const stopsAway = userStopIndex >= 0 ? Math.max(0, userStopIndex - Number(trip?.currentStopIndex || 0)) : null;
  const distanceKm = live && userLocation
    ? haversineKm(userLocation.latitude, userLocation.longitude, trip.latitude, trip.longitude)
    : null;
  const estimatedKm = distanceKm == null && stopsAway != null ? stopsAway * 1.2 : null;
  const distanceLabel = distanceKm != null ? formatDistance(distanceKm) : estimatedKm != null ? `~${formatDistance(estimatedKm)}` : "—";
  const etaToStop = stopsAway != null ? Math.max(0, (trip?.eta || 0) - ((stops.length - 1 - userStopIndex) * 4)) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{route?.name || "Live location details"}</Text>
          <Text style={styles.subTitle}>{route?.busNo || route?.vehicleNo || "Bus"} · {trip?.direction === "return" ? "Return" : "Pickup"}</Text>
        </View>
        <View style={[styles.statusBadge, live ? styles.liveOn : styles.liveOff]}>
          <View style={[styles.dot, { backgroundColor: live ? C.success : C.muted }]} />
          <Text style={[styles.statusText, { color: live ? C.success : C.muted }]}>{live ? "LIVE GPS" : "GPS WAIT"}</Text>
        </View>
      </View>

      <View style={styles.locationPanel}>
        <Text style={styles.panelLabel}>Current bus location</Text>
        <Text style={styles.locationText}>{locationText(trip)}</Text>
        <Text style={styles.locationMeta}>Updated: {formatGpsTime(trip?.locationUpdatedAt)}</Text>
        {live ? (
          <Text style={styles.locationMeta}>Coordinates: {Number(trip.latitude).toFixed(5)}, {Number(trip.longitude).toFixed(5)}</Text>
        ) : null}
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Current stop</Text>
          <Text style={styles.detailValue}>{currentStop}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Next stop</Text>
          <Text style={styles.detailValue}>{nextStop}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Bus distance</Text>
          <Text style={styles.detailValue}>{showDistance ? distanceLabel : "—"}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>ETA</Text>
          <Text style={styles.detailValue}>{etaToStop != null ? `${etaToStop} min` : `${trip?.eta || 0} min`}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Speed</Text>
          <Text style={styles.detailValue}>{trip?.speed || 0} km/h</Text>
        </View>
      </View>

      <View style={styles.userStopBox}>
        <Text style={styles.panelLabel}>Your stop</Text>
        <Text style={styles.stopText}>{userStop || "Not assigned"}</Text>
        <Text style={styles.locationMeta}>{stopsAway != null ? `${stopsAway} stop(s) away` : "Stop distance will update when route data is available."}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 15, fontWeight: "900" },
  subTitle: { color: C.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  liveOn: { backgroundColor: "rgba(46,184,114,0.12)" },
  liveOff: { backgroundColor: "rgba(107,114,128,0.12)" },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: "900" },
  locationPanel: { padding: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  panelLabel: { color: C.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  locationText: { color: C.text, fontSize: 14, fontWeight: "900", lineHeight: 20, marginTop: 5 },
  locationMeta: { color: C.muted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  detailGrid: { flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingTop: 10 },
  detailBox: { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 9, borderWidth: 1, borderColor: C.border },
  detailLabel: { color: C.muted, fontSize: 10, fontWeight: "800" },
  detailValue: { color: C.text, fontSize: 13, fontWeight: "900", marginTop: 3 },
  userStopBox: { padding: 12 },
  stopText: { color: C.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
});
