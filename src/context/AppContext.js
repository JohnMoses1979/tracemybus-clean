import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { appAlert } from "../utils/alerts";
import {
  makeId,
  timeNow,
  dateNow,
  passengersOnRoute,
  passengersAtStop,
} from "../utils/helpers";
import { api } from "../services/api";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const EMPTY_NOTIFICATIONS = {};

function listToTripMap(tripItems = []) {
  return tripItems.reduce((acc, trip) => {
    if (trip?.routeId) acc[trip.routeId] = trip;
    return acc;
  }, {});
}

function notificationMapForUser(userId, items = []) {
  if (!userId) return EMPTY_NOTIFICATIONS;
  const parsed = Array.isArray(items) ? items.map(item => ({
    ...item,
    extra: typeof item.extra === 'string'
      ? (() => { try { return JSON.parse(item.extra); } catch { return {}; } })()
      : (item.extra || {})
  })) : [];
  return { [userId]: parsed };
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "").trim();
}

function profilePhotoStorageKey(userId) {
  return userId ? `TMB_PROFILE_PHOTO_${userId}` : "";
}

async function getLocalProfilePhoto(userId) {
  if (!userId) return "";
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return (await AsyncStorage.getItem(profilePhotoStorageKey(userId))) || "";
  } catch (_) {
    return "";
  }
}

async function saveLocalProfilePhoto(userId, photo) {
  if (!userId) return;
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const key = profilePhotoStorageKey(userId);
    if (photo) await AsyncStorage.setItem(key, photo);
    else await AsyncStorage.removeItem(key);
  } catch (_) {}
}

async function mergeLocalProfilePhoto(user) {
  if (!user?.id) return user;
  const localPhoto = await getLocalProfilePhoto(user.id);
  return localPhoto ? { ...user, profilePhoto: localPhoto } : user;
}


export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState({});
  const [approvals, setApprovals] = useState([]);
  const [notifications, setNotifications] = useState(EMPTY_NOTIFICATIONS);
  const [currentUser, setCurrentUser] = useState(null);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const setTripInState = (trip) => {
    if (!trip?.routeId) return;
    setTrips((prev) => ({ ...prev, [trip.routeId]: trip }));
  };

  const refreshPublicRegistrationData = useCallback(async () => {
    try {
      const [orgsRes, routesRes] = await Promise.all([
        api.getPublicOrgs().catch(() => ({ orgs: [] })),
        api.getPublicRoutes().catch(() => ({ routes: [] })),
      ]);

      setOrgs(Array.isArray(orgsRes.orgs) ? orgsRes.orgs : []);
      setRoutes(Array.isArray(routesRes.routes) ? routesRes.routes : []);
    } catch (error) {
      console.log("refreshPublicRegistrationData error", error?.message || error);
      setOrgs([]);
      setRoutes([]);
    }
  }, []);

  const refreshData = useCallback(async (user = currentUser) => {
    if (!user) return;

    try {
      const [usersRes, orgsRes, routesRes, approvalsRes, notificationsRes, sosRes] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getOrgs().catch(() => ({ orgs: [] })),
        api.getRoutes().catch(() => ({ routes: [] })),
        api.getApprovals().catch(() => ({ approvals: [] })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getSosAlerts ? api.getSosAlerts().catch(() => ({ sosAlerts: [] })) : Promise.resolve({ sosAlerts: [] }),
      ]);

      const nextUsers = usersRes.users || [];
      const nextOrgs = orgsRes.orgs || [];
      const nextRoutes = routesRes.routes || [];
      const nextApprovals = approvalsRes.approvals || [];
      const nextNotifications = notificationsRes.notifications || [];
      const nextSosAlerts = sosRes.sosAlerts || [];

      setUsers(nextUsers);
      setOrgs(nextOrgs);
      setRoutes(nextRoutes);
      setApprovals(nextApprovals);
      setNotifications(notificationMapForUser(user.id, nextNotifications));
      setSosAlerts(nextSosAlerts);

      const tripResponses = await Promise.all(
        nextRoutes.map((route) =>
          api.getTrip(route.id)
            .then((res) => res.trip)
            .catch(() => null)
        )
      );

      setTrips(listToTripMap(tripResponses.filter(Boolean)));
    } catch (error) {
      console.log("refreshData error", error?.message || error);
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        setLoading(true);
        const res = await api.me();
        if (!mounted) return;
        const mergedUser = await mergeLocalProfilePhoto(res.user);
        setCurrentUser(mergedUser);
        await refreshData(mergedUser);
      } catch (_) {
        await api.logout();
        await refreshPublicRegistrationData();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();
    return () => { mounted = false; };
  }, [refreshPublicRegistrationData]);

  // ── Android/iOS tray push notifications ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function savePushToken() {
      if (!currentUser?.id || currentUser?.notificationEnabled === false) return;

      try {
        const result = await registerForPushNotificationsAsync();
        if (!cancelled && result?.ok && result.token) {
          await api.registerPushToken(result.token, Platform.OS);
        }
      } catch (error) {
        console.log("push token registration error", error?.message || error);
      }
    }

    savePushToken();
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.notificationEnabled]);

  // ── Local notification helpers, kept for old UI compatibility ───────────────
  const buildNotification = (icon, title, body, extra = {}) => ({
    id: makeId("n"),
    icon,
    title,
    body,
    time: timeNow(),
    date: dateNow(),
    read: false,
    ...extra,
  });

  const pushNotif = (userId, icon, title, body, extra = {}) => {
    if (!userId) return;
    const item = buildNotification(icon, title, body, extra);
    setNotifications((prev) => ({
      ...prev,
      [userId]: [item, ...(prev[userId] || [])],
    }));
  };

  const pushToMany = (ids = [], icon, title, body, extra = {}) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return;
    setNotifications((prev) => {
      const next = { ...prev };
      uniqueIds.forEach((id) => {
        next[id] = [buildNotification(icon, title, body, extra), ...(next[id] || [])];
      });
      return next;
    });
  };

  const adminIdsForOrg = (orgId) =>
    users.filter((u) => u.role === "admin" && u.orgId === orgId).map((u) => u.id);

  const superAdminIds = () =>
    users.filter((u) => u.role === "superadmin").map((u) => u.id);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = async (phone, password) => {
    try {
      const res = await api.login(phone, password);
      const mergedUser = await mergeLocalProfilePhoto(res.user);
      setCurrentUser(mergedUser);
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("WIMB_USER", JSON.stringify(mergedUser));
      } catch (_) {}
      await refreshData(mergedUser);
      return { ok: true, user: mergedUser };
    } catch (error) {
      return {
        ok: false,
        msg: error?.message || "Login failed.",
        pending: !!error?.pending,
        rejected: !!error?.rejected,
        phone: error?.phone || normalizePhone(phone),
        request: error?.request,
      };
    }
  };

  const logout = async () => {
    try { await api.registerPushToken("", Platform.OS); } catch (_) {}
    await api.logout();
    setCurrentUser(null);
    setUsers([]);
    setTrips({});
    setApprovals([]);
    setNotifications(EMPTY_NOTIFICATIONS);
    setSosAlerts([]);
    setOrgs([]);
    setRoutes([]);
  };

  const updateCurrentUser = async (updated) => {
    const hasProfilePhotoUpdate = Object.prototype.hasOwnProperty.call(updated || {}, "profilePhoto");
    const optimisticUser = {
      ...(currentUser || {}),
      ...(updated || {}),
    };

    if (hasProfilePhotoUpdate) {
      await saveLocalProfilePhoto(optimisticUser.id, optimisticUser.profilePhoto || "");
      setCurrentUser(optimisticUser);
      setUsers((prev) => prev.map((u) => (u.id === optimisticUser.id ? { ...u, profilePhoto: optimisticUser.profilePhoto || "" } : u)));
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("WIMB_USER", JSON.stringify(optimisticUser));
      } catch (_) {}
    }

    try {
      const res = await api.updateMe(updated);
      const serverUser = await mergeLocalProfilePhoto(res.user);
      setCurrentUser(serverUser);
      setUsers((prev) => prev.map((u) => (u.id === serverUser.id ? serverUser : u)));
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("WIMB_USER", JSON.stringify(serverUser));
      } catch (_) {}
      return { ok: true, user: serverUser };
    } catch (error) {
      if (hasProfilePhotoUpdate) {
        // Keep the photo locally even if backend rejects a large image payload.
        return { ok: true, user: optimisticUser, localOnly: true };
      }
      appAlert("Update Failed", error?.message || "Could not update profile.");
      return { ok: false, msg: error?.message || "Could not update profile." };
    }
  };

  // ── Registration ────────────────────────────────────────────────────────────
  const registerAdminRequest = async (data) => {
    try {
      const res = await api.registerAdmin(data);
      if (res.request) setApprovals((prev) => [res.request, ...prev]);
      return { ok: true, request: res.request };
    } catch (error) {
      return { ok: false, msg: error?.message || "Admin registration failed." };
    }
  };

  const registerUserRequest = async (data) => {
    try {
      const res = await api.registerUser(data);
      if (res.request) setApprovals((prev) => [res.request, ...prev]);
      return { ok: true, request: res.request };
    } catch (error) {
      return { ok: false, msg: error?.message || "User registration failed." };
    }
  };

  // ── Approvals ───────────────────────────────────────────────────────────────
  const approveAdminRequest = async (req) => {
    try {
      const res = await api.approveRequest(req.id);
      setApprovals((prev) => prev.map((a) => (a.id === req.id ? res.request : a)));
      await refreshData(currentUser);
      appAlert("Approved ✅", `${req.name}'s organisation is now live.`);
      return { ok: true };
    } catch (error) {
      appAlert("Approval Failed", error?.message || "Could not approve request.");
      return { ok: false, msg: error?.message || "Could not approve request." };
    }
  };

  const approveUserRequest = async (req) => {
    try {
      const res = await api.approveRequest(req.id);
      setApprovals((prev) => prev.map((a) => (a.id === req.id ? res.request : a)));
      await refreshData(currentUser);
      appAlert("Approved ✅", `${req.name} can now login.`);
      return { ok: true };
    } catch (error) {
      appAlert("Approval Failed", error?.message || "Could not approve request.");
      return { ok: false, msg: error?.message || "Could not approve request." };
    }
  };

  const rejectRequest = async (id) => {
    try {
      const res = await api.rejectRequest(id);
      setApprovals((prev) => prev.map((a) => (a.id === id ? res.request : a)));
      appAlert("Rejected", "Request has been rejected.");
      return { ok: true };
    } catch (error) {
      appAlert("Reject Failed", error?.message || "Could not reject request.");
      return { ok: false, msg: error?.message || "Could not reject request." };
    }
  };

  // ── Route management ────────────────────────────────────────────────────────
  const createRoute = async (data) => {
    try {
      const res = await api.createRoute(data);
      await refreshData(currentUser);
      appAlert("Route Created ✅", `Route "${data.name}" created successfully.`);
      return { ok: true, route: res.route };
    } catch (error) {
      appAlert("Route Failed", error?.message || "Could not create route.");
      return { ok: false, msg: error?.message || "Could not create route." };
    }
  };

  const updateRoute = async (id, data) => {
    try {
      const res = await api.updateRoute(id, data);
      setRoutes((prev) => prev.map((r) => (r.id === id ? res.route : r)));
      await refreshData(currentUser);
      return { ok: true, route: res.route };
    } catch (error) {
      appAlert("Update Failed", error?.message || "Could not update route.");
      return { ok: false, msg: error?.message || "Could not update route." };
    }
  };

  const deleteRoute = async (id) => {
    try {
      await api.deleteRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setTrips((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refreshData(currentUser);
      return { ok: true };
    } catch (error) {
      appAlert("Delete Failed", error?.message || "Could not delete route.");
      return { ok: false, msg: error?.message || "Could not delete route." };
    }
  };

  const assignUserToRoute = async (userId, routeId, stop) => {
    try {
      const res = await api.assignUserToRoute({ userId, routeId, stop });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      if (currentUser?.id === userId) setCurrentUser(res.user);
      await refreshData(currentUser);
      return { ok: true, user: res.user };
    } catch (error) {
      appAlert("Assign Failed", error?.message || "Could not assign route.");
      return { ok: false, msg: error?.message || "Could not assign route." };
    }
  };

  const removeUserFromRoute = async (userId) => {
    try {
      const res = await api.removeUserFromRoute(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      if (currentUser?.id === userId) setCurrentUser(res.user);
      await refreshData(currentUser);
      return { ok: true, user: res.user };
    } catch (error) {
      appAlert("Remove Failed", error?.message || "Could not remove route.");
      return { ok: false, msg: error?.message || "Could not remove route." };
    }
  };

  // ── Trip actions ────────────────────────────────────────────────────────────
  const startTrip = async (routeId, direction = "pickup") => {
    try {
      const res = await api.startTrip(routeId, direction);
      setTripInState(res.trip);
      appAlert(direction === "return" ? "Return Trip Started ✅" : "Pickup Trip Started ✅", "GPS is ON. Passengers and admin can now track the bus.");
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("Trip Failed", error?.message || "Could not start trip.");
      return { ok: false, msg: error?.message || "Could not start trip." };
    }
  };

  const endTrip = async (routeId) => {
    try {
      const res = await api.endTrip(routeId);
      setTripInState(res.trip);
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("Trip Failed", error?.message || "Could not end trip.");
      return { ok: false, msg: error?.message || "Could not end trip." };
    }
  };

  const nextStop = async (routeId) => {
    try {
      const res = await api.nextStop(routeId);
      setTripInState(res.trip);
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("Stop Update Failed", error?.message || "Could not move to next stop.");
      return { ok: false, msg: error?.message || "Could not move to next stop." };
    }
  };

  const setPassengerTripStatus = async (routeId, passengerId, status) => {
    try {
      const res = await api.setPassengerStatus(routeId, passengerId, status);
      setTripInState(res.trip);
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("Status Failed", error?.message || "Could not update passenger status.");
      return { ok: false, msg: error?.message || "Could not update passenger status." };
    }
  };

  const markPickedup = (routeId, passengerId) => setPassengerTripStatus(routeId, passengerId, "pickedup");
  const markAbsent = (routeId, passengerId) => setPassengerTripStatus(routeId, passengerId, "absent");
  const editPickupStatus = (routeId, passengerId, status = "waiting") => setPassengerTripStatus(routeId, passengerId, status);

  const sendDelay = async (routeId) => {
    try {
      const res = await api.sendDelay(routeId);
      setTripInState(res.trip);
      appAlert("Delay Reported", "All passengers notified of +10 min delay.");
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("Delay Failed", error?.message || "Could not send delay.");
      return { ok: false, msg: error?.message || "Could not send delay." };
    }
  };

  const toggleGps = async (routeId) => {
    try {
      const res = await api.toggleGps(routeId);
      setTripInState(res.trip);
      return { ok: true, trip: res.trip };
    } catch (error) {
      appAlert("GPS Failed", error?.message || "Could not toggle GPS.");
      return { ok: false, msg: error?.message || "Could not toggle GPS." };
    }
  };

  const sendDriverSos = async (routeId) => {
    try {
      const res = await api.sendDriverSos(routeId);
      appAlert("🚨 SOS Sent", "Admin and all passengers have been alerted.");
      return { ok: true, ...res };
    } catch (error) {
      appAlert("SOS Failed", error?.message || "Could not send SOS.");
      return { ok: false, msg: error?.message || "Could not send SOS." };
    }
  };

  const sendPassengerSos = async (routeId) => {
    try {
      const res = await api.sendPassengerSos(routeId);
      appAlert("🚨 SOS Sent", "Admin and driver have been alerted.");
      return { ok: true, ...res };
    } catch (error) {
      appAlert("SOS Failed", error?.message || "Could not send SOS.");
      return { ok: false, msg: error?.message || "Could not send SOS." };
    }
  };

  // ── SOS response / resolve ─────────────────────────────────────────────────
  const respondToSos = async (sosId, response = "Help is on the way. Please stay safe.") => {
    try {
      const res = await api.respondSos(sosId, response);
      await refreshData(currentUser);
      appAlert("SOS Responded ✅", res?.msg || "Response sent successfully.");
      return { ok: true, sos: res.sos };
    } catch (error) {
      appAlert("SOS Response Failed", error?.message || "Could not respond to SOS.");
      return { ok: false, msg: error?.message || "Could not respond to SOS." };
    }
  };

  const resolveSos = async (sosId, response = "SOS has been resolved.") => {
    try {
      const res = await api.resolveSos(sosId, response);
      await refreshData(currentUser);
      appAlert("SOS Resolved ✅", res?.msg || "SOS resolved successfully.");
      return { ok: true, sos: res.sos };
    } catch (error) {
      appAlert("SOS Resolve Failed", error?.message || "Could not resolve SOS.");
      return { ok: false, msg: error?.message || "Could not resolve SOS." };
    }
  };

  // ── Notifications ───────────────────────────────────────────────────────────
  const markRead = async (userId, notifId) => {
    try {
      await api.markRead(notifId);
      setNotifications((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((n) => (n.id === notifId ? { ...n, read: true } : n)),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, msg: error?.message || "Could not mark notification read." };
    }
  };

  const markAllRead = async (userId) => {
    try {
      await api.markAllRead();
      setNotifications((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((n) => ({ ...n, read: true })),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, msg: error?.message || "Could not mark all notifications read." };
    }
  };

  const getBroadcastInfo = () => {
    if (currentUser?.role === "superadmin") {
      const ids = users
        .filter((u) => u.role === "admin" && u.approved && u.active !== false)
        .map((u) => u.id);
      return { ids, title: "Message", audience: "", audienceDetails: "" };
    }

    if (currentUser?.role === "admin") {
      const ids = users
        .filter((u) =>
          ["driver", "school", "college", "employee"].includes(u.role) &&
          u.approved &&
          u.active !== false &&
          u.orgId === currentUser.orgId
        )
        .map((u) => u.id);
      return { ids, title: "Message", audience: "", audienceDetails: "" };
    }

    return { ids: [], title: "Message", audience: "", audienceDetails: "" };
  };

  const sendBroadcastMessage = async (message) => {
    const text = String(message || "").trim();
    if (!text) return { ok: false, msg: "Please type a message before sending." };

    try {
      const res = await api.sendBroadcast(text);
      await refreshData(currentUser);
      appAlert("Message Sent ✅", "Message sent successfully.");
      return { ok: true, count: res.count, audience: res.audience };
    } catch (error) {
      appAlert("Message Failed", error?.message || "Could not send message.");
      return { ok: false, msg: error?.message || "Could not send message." };
    }
  };

  const broadcastToOrg = (_orgId, message) => sendBroadcastMessage(message);
  const broadcastToAll = (message) => sendBroadcastMessage(message);

  return (
    <AppContext.Provider value={{
      // State
      users,
      orgs,
      routes,
      trips,
      approvals,
      notifications,
      currentUser,
      sosAlerts,
      loading,
      refreshData,
      refreshPublicRegistrationData,

      // Auth
      login,
      logout,
      updateCurrentUser,

      // Registration
      registerAdminRequest,
      registerUserRequest,

      // Approvals
      approveAdminRequest,
      approveUserRequest,
      rejectRequest,

      // Routes
      createRoute,
      updateRoute,
      deleteRoute,
      assignUserToRoute,
      removeUserFromRoute,

      // Trip
      startTrip,
      endTrip,
      nextStop,
      markPickedup,
      markAbsent,
      editPickupStatus,
      sendDelay,
      toggleGps,
      sendDriverSos,
      sendPassengerSos,
      respondToSos,
      resolveSos,

      // Notifications / broadcast
      markRead,
      markAllRead,
      broadcastToOrg,
      broadcastToAll,
      sendBroadcastMessage,
      getBroadcastInfo,
      pushNotif,
      pushToMany,

      // Small helpers exposed for old screens if needed
      adminIdsForOrg,
      superAdminIds,
      passengersOnRoute,
      passengersAtStop,
    }}>
      {children}
    </AppContext.Provider>
  );
}
