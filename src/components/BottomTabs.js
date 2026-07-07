import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useApp } from "../context/AppContext";

const aiTab = {
  name: "ChatBot",
  label: "AI",
  iconType: "vector",
  iconName: "robot-excited-outline",
};

const TABS = {
  superadmin: [
    { name: "SuperHome", label: "Home", icon: "🏠" },
    { name: "SuperOrgs", label: "Orgs", icon: "🏢" },
    { name: "SuperApprovals", label: "Approvals", icon: "✅" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
  admin: [
    { name: "AdminHome", label: "Home", icon: "🏠" },
    { name: "AdminApprovals", label: "Approvals", icon: "✅" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
  driver: [
    { name: "DriverHome", label: "Home", icon: "🏠" },
    { name: "DriverTrip", label: "Trip", icon: "🚗" },
    { name: "Tracking", label: "GPS", icon: "📍" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
  school: [
    { name: "PassengerHome", label: "Home", icon: "🏠" },
    { name: "Tracking", label: "Track", icon: "📍" },
    { name: "SOS", label: "SOS", icon: "🚨" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
  college: [
    { name: "PassengerHome", label: "Home", icon: "🏠" },
    { name: "Tracking", label: "Track", icon: "📍" },
    { name: "SOS", label: "SOS", icon: "🚨" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
  employee: [
    { name: "PassengerHome", label: "Home", icon: "🏠" },
    { name: "Tracking", label: "Track", icon: "📍" },
    { name: "SOS", label: "SOS", icon: "🚨" },
    aiTab,
    { name: "Profile", label: "Profile", icon: "👤" },
  ],
};

export function BottomTabs({ state, descriptors, navigation }) {
  const app = useApp() || {};
  const currentUser = app.currentUser;
  const notificationList = Array.isArray(app.notifications) ? app.notifications : [];
  if (!currentUser) return null;

  const tabs = TABS[currentUser.role] || TABS.school;
  const routeNames = state.routes.map((r) => r.name);
  const unread = notificationList.filter((n) => !n.read).length;

  const renderIcon = (tab, isFocused) => {
    if (tab.iconType === "vector") {
      return (
        <View style={[styles.aiIconWrap, isFocused && styles.aiIconWrapActive]}>
          <MaterialCommunityIcons
            name={tab.iconName}
            size={isFocused ? 22 : 20}
            color={isFocused ? C.white : C.primary}
          />
        </View>
      );
    }

    return <Text style={{ fontSize: isFocused ? 23 : 20 }}>{tab.icon}</Text>;
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const routeIndex = routeNames.indexOf(tab.name);
        if (routeIndex === -1) return null;
        const isFocused = state.index === routeIndex;
        const badge = tab.name === "Notifications" && unread > 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: state.routes[routeIndex]?.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.name);
              }
            }}
          >
            <View>
              {renderIcon(tab, isFocused)}
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 76,
    backgroundColor: C.nav,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 18,
  },
  tabLabel: {
    fontSize: 10,
    color: C.mutedLight,
    fontWeight: "800",
    marginTop: 3,
  },
  tabLabelActive: {
    color: C.accent,
    fontWeight: "900",
  },
  aiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,184,114,0.22)",
  },
  aiIconWrapActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: C.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: C.white,
    fontSize: 9,
    fontWeight: "900",
  },
});
