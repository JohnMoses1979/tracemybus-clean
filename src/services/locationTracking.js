// src/services/locationTracking.js
// Driver live GPS tracking for foreground + APK background updates.
// Sends coordinates + readable location details to backend.

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { API_BASE_URL } from "./api";

export const DRIVER_LOCATION_TASK = "WHEREISMYBUS_DRIVER_LOCATION_TASK";

let lastGeoKey = "";
let lastGeoDetails = {};

function safeText(value) {
  return String(value || "").trim();
}

function buildAddress(place = {}) {
  const line1 = [place.name, place.street].map(safeText).filter(Boolean).join(", ");
  const line2 = [place.district, place.city, place.region].map(safeText).filter(Boolean).join(", ");
  const line3 = [place.postalCode, place.country].map(safeText).filter(Boolean).join(" - ");
  return [line1, line2, line3].filter(Boolean).join(" · ");
}

async function reverseGeocode(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};

  // Round to ~100m so we do not reverse-geocode every few seconds at same place.
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (key === lastGeoKey && lastGeoDetails?.locationAddress) return lastGeoDetails;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results?.[0] || {};
    const details = {
      locationAddress: buildAddress(place),
      locationCity: safeText(place.city || place.subregion || place.district),
      locationRegion: safeText(place.region),
      locationPostalCode: safeText(place.postalCode),
      locationCountry: safeText(place.country),
      locationLabel: buildAddress(place) || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    };
    lastGeoKey = key;
    lastGeoDetails = details;
    return details;
  } catch (_) {
    return {
      locationLabel: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    };
  }
}

async function toPayload(location) {
  const coords = location?.coords || {};
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  const speedMps = Number(coords.speed || 0);
  const details = await reverseGeocode(latitude, longitude);

  return {
    latitude,
    longitude,
    accuracy: coords.accuracy,
    heading: coords.heading,
    speedKmh: Number.isFinite(speedMps) && speedMps > 0 ? speedMps * 3.6 : 0,
    timestamp: location?.timestamp || Date.now(),
    ...details,
  };
}

async function postLocation(routeId, location) {
  const token = await AsyncStorage.getItem("WIMB_TOKEN");
  if (!token || !routeId || !location?.coords) return;

  const payload = await toPayload(location);

  await fetch(`${API_BASE_URL}/trips/${routeId}/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const location = data?.locations?.[0];
  const routeId = await AsyncStorage.getItem("WIMB_TRACKING_ROUTE_ID");
  if (location && routeId) await postLocation(routeId, location);
});

export async function ensureLocationPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    throw new Error("Location permission is required for live bus tracking.");
  }

  let bgStatus = "unavailable";
  if (Platform.OS !== "web") {
    const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
    bgStatus = bg?.status || "denied";
  }

  return { foreground: fg.status, background: bgStatus };
}

export async function startDriverLocationTracking(routeId, onLocation) {
  if (!routeId) throw new Error("Route ID is required to start GPS tracking.");

  const permissions = await ensureLocationPermissions();
  await AsyncStorage.setItem("WIMB_TRACKING_ROUTE_ID", routeId);

  const foregroundSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    async (location) => {
      onLocation?.(location);
      await postLocation(routeId, location);
    }
  );

  if (Platform.OS !== "web" && permissions.background === "granted") {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
    if (!alreadyStarted) {
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 20,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: "TraceMyBus live tracking",
          notificationBody: "Driver location is being shared with passengers and admin.",
          notificationColor: "#2E7D32",
        },
      }).catch(() => null);
    }
  }

  return {
    permissions,
    removeForeground: () => foregroundSub?.remove?.(),
    stopAll: () => stopDriverLocationTracking(),
  };
}

export async function stopDriverLocationTracking() {
  await AsyncStorage.removeItem("WIMB_TRACKING_ROUTE_ID");
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => null);
}

export async function sendDriverLocationOnce(routeId) {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await postLocation(routeId, loc);
  return loc;
}
