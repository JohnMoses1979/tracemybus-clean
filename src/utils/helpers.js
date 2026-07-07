export const makeId  = (p = "id") => `${p}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
export const timeNow = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
export const dateNow = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const initials = (name = "") => name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();

export const routeForUser = (user, routes) => {
  if (!user?.routeId) return null;
  return routes.find((r) => r.id === user.routeId) || null;
};

export const driverForRoute = (route, users) =>
  users.find((u) => u.id === route?.driverId) || null;

export const routeReturnStops = (route) => {
  const baseStops = Array.isArray(route?.stops) ? route.stops : [];
  const customReturn = Array.isArray(route?.returnStops) ? route.returnStops.filter(Boolean) : [];
  return customReturn.length >= 2 ? customReturn : [...baseStops].reverse();
};

export const routeStopsForTrip = (route, tripOrDirection) => {
  const direction = typeof tripOrDirection === "string" ? tripOrDirection : tripOrDirection?.direction;
  if (direction === "return") return routeReturnStops(route);
  return Array.isArray(route?.stops) ? route.stops : [];
};

export const tripStatusKey = (tripOrDirection) => {
  const direction = typeof tripOrDirection === "string" ? tripOrDirection : tripOrDirection?.direction;
  return direction === "return" ? "returnStatus" : "pickupStatus";
};

export const passengersOnRoute = (routeId, users) =>
  users.filter((u) => u.routeId === routeId && ["school", "college", "employee"].includes(u.role));

export const passengersAtStop = (routeId, stop, users) =>
  users.filter((u) => u.routeId === routeId && u.stop === stop && ["school", "college", "employee"].includes(u.role));

export const childrenForUser = (user) => {
  if (!user || !["school", "college"].includes(user.role)) return [];
  if (Array.isArray(user.children) && user.children.length > 0) {
    return user.children.map((c, index) => ({
      id: c.id || `${user.id || "child"}_${index}`,
      name: c.name || c.childName || "",
      className: c.className || c.childClass || "",
      rollNo: c.rollNo || c.childRollNo || "",
    }));
  }
  if (user.childName || user.childClass || user.childRollNo) {
    return [{
      id: `${user.id || "child"}_child_1`,
      name: user.childName || "",
      className: user.childClass || "",
      rollNo: user.childRollNo || "",
    }];
  }
  return [];
};

export const childNamesText = (user) => {
  const kids = childrenForUser(user).filter((c) => c.name);
  if (kids.length === 0) return user?.name || "User";
  return kids.map((c) => c.name).join(", ");
};

export const displayName = (user) =>
  (user?.role === "school" || user?.role === "college") ? childNamesText(user) : user?.name;

export const orgRoutes  = (orgId, routes) => routes.filter((r) => r.orgId === orgId);
export const orgUsers   = (orgId, users)  => users.filter((u)  => u.orgId === orgId && u.role !== "admin");
export const orgDrivers = (orgId, users)  => users.filter((u)  => u.orgId === orgId && u.role === "driver");
