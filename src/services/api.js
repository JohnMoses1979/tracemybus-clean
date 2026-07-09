import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_BASE_URL = "http://15.168.41.36:8080/api";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_API_BASE_URL;

async function getToken() {
  return AsyncStorage.getItem("WIMB_TOKEN");
}

// Parse JSON-string fields that the Spring backend stores as raw JSON columns.
// routes have stops:string, trips have pickupStatus/returnStatus/logs:string.
function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value; // already parsed
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRoute(route) {
  if (!route) return route;
  return {
    ...route,
    stops: parseJsonField(route.stops, []),
  };
}

function normalizeTrip(trip) {
  if (!trip) return trip;
  return {
    ...trip,
    pickupStatus: parseJsonField(trip.pickupStatus, {}),
    returnStatus: parseJsonField(trip.returnStatus, {}),
    logs: parseJsonField(trip.logs, []),
  };
}

function normalizeData(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.route) out.route = normalizeRoute(out.route);
  if (Array.isArray(out.routes)) out.routes = out.routes.map(normalizeRoute);
  if (out.trip) out.trip = normalizeTrip(out.trip);
  if (Array.isArray(out.trips)) out.trips = out.trips.map(normalizeTrip);
  return out;
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const err = new Error(
      `Cannot connect to TraceMyBus backend. Check API URL: ${API_BASE_URL}`
    );
    err.originalError = error;
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.msg || data.message || "Something went wrong");
    Object.assign(err, data);
    err.status = res.status;
    throw err;
  }

  return normalizeData(data);
}

export const api = {
  request,

  sendOtp: (phone, purpose = "register") =>
    request("/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone, purpose }),
    }),

  verifyOtp: (phone, otp, purpose = "register") =>
    request("/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp, purpose }),
    }),

  sendRegistrationOtp: (email) =>
    request("/otp/send", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "register" }),
    }),

  verifyRegistrationOtp: (email, otp) =>
    request("/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp, purpose: "register" }),
    }),

  sendForgotPasswordOtp: (phone) =>
    request("/auth/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyForgotPasswordOtp: (phone, otp) =>
    request("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  resetForgotPassword: (phone, newPassword) =>
    request("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ phone, newPassword }),
    }),

  resetProfilePassword: (currentPassword, newPassword) =>
    request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  registerPushToken: (expoPushToken, platform = "") =>
    request("/users/push-token", {
      method: "POST",
      body: JSON.stringify({ expoPushToken, platform }),
    }),

  async login(phone, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });

    if (data.token) await AsyncStorage.setItem("WIMB_TOKEN", data.token);
    if (data.user) await AsyncStorage.setItem("WIMB_USER", JSON.stringify(data.user));

    return data;
  },

  async logout() {
    await AsyncStorage.multiRemove(["WIMB_TOKEN", "WIMB_USER"]);
  },

  async getSavedUser() {
    const saved = await AsyncStorage.getItem("WIMB_USER");
    return saved ? JSON.parse(saved) : null;
  },

  me: () => request("/auth/me"),

  registerAdmin: (payload) =>
    request("/auth/register/admin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  registerUser: (payload) =>
    request("/auth/register/user", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUsers: () => request("/users"),

  updateMe: (payload) =>
    request("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  assignUserToRoute: (payload) =>
    request("/users/assign-route", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  removeUserFromRoute: (userId) =>
    request("/users/remove-route", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  getOrgs: () => request("/orgs"),
  getPublicOrgs: () => request("/public/orgs"),
  getPublicRoutes: (orgId) =>
    request(orgId ? `/public/routes?orgId=${encodeURIComponent(orgId)}` : "/public/routes"),

  updateOrg: (id, payload) =>
    request(`/orgs/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getRoutes: () => request("/routes"),

  createRoute: (payload) =>
    request("/routes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRoute: (id, payload) =>
    request(`/routes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteRoute: (id) =>
    request(`/routes/${id}`, {
      method: "DELETE",
    }),

  getApprovals: () => request("/approvals?status=pending"),

  approveRequest: (id) =>
    request(`/approvals/${id}/approve`, {
      method: "POST",
    }),

  rejectRequest: (id) =>
    request(`/approvals/${id}/reject`, {
      method: "POST",
    }),

  getTrip: (routeId) => request(`/trips/${routeId}`),

  startTrip: (routeId, direction = "pickup") =>
    request(`/trips/${routeId}/start`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  endTrip: (routeId) =>
    request(`/trips/${routeId}/end`, {
      method: "POST",
    }),

  nextStop: (routeId) =>
    request(`/trips/${routeId}/next-stop`, {
      method: "POST",
    }),

  setPassengerStatus: (routeId, passengerId, status) =>
    request(`/trips/${routeId}/passenger-status`, {
      method: "POST",
      body: JSON.stringify({ passengerId, status }),
    }),

  sendDelay: (routeId) =>
    request(`/trips/${routeId}/delay`, {
      method: "POST",
    }),

  toggleGps: (routeId) =>
    request(`/trips/${routeId}/gps`, {
      method: "POST",
    }),

  updateLocation: (routeId, latitude, longitude, extra = {}) =>
    request(`/trips/${routeId}/location`, {
      method: "POST",
      body: JSON.stringify({ latitude, longitude, ...extra }),
    }),

  sendDriverSos: (routeId) =>
    request(`/trips/${routeId}/driver-sos`, {
      method: "POST",
    }),

  sendPassengerSos: (routeId) =>
    request("/sos/passenger", {
      method: "POST",
      body: JSON.stringify({ routeId }),
    }),

  getSosAlerts: () => request("/sos"),

  respondSos: (sosId, response) =>
    request(`/sos/${sosId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),

  resolveSos: (sosId, response) =>
    request(`/sos/${sosId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),

  getNotifications: () => request("/notifications"),

  markRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllRead: () =>
    request("/notifications/read-all", {
      method: "POST",
    }),

  sendBroadcast: (message) =>
    request("/broadcast", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

export default api;
