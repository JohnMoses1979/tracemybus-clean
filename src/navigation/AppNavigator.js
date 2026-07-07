import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useApp } from "../context/AppContext";
import { BottomTabs } from "../components/BottomTabs";

// Auth screens
import LoginScreen           from "../screens/auth/LoginScreen";
import RegisterScreen        from "../screens/auth/RegisterScreen";
import WaitingApprovalScreen from "../screens/auth/WaitingApprovalScreen";

// SuperAdmin screens
import SuperHomeScreen                              from "../screens/superadmin/SuperHomeScreen";
import { SuperApprovalsScreen, SuperOrgsScreen }   from "../screens/superadmin/SuperAdminScreens";

// Admin screens
import { AdminHomeScreen, AdminApprovalsScreen, AdminFleetScreen, AdminRoutesScreen, AdminUsersScreen } from "../screens/admin/AdminScreens";

// Driver screens
import { DriverHomeScreen, DriverTripScreen } from "../screens/driver/DriverScreens";

// Passenger screens
import { PassengerHomeScreen, TrackingScreen } from "../screens/tracking/PassengerScreens";

// ChatBot screen
import ChatBotScreen from "../screens/chatbot/ChatBotScreen";

// Shared screens
import { NotificationsScreen, BroadcastScreen, SOSScreen, ProfileScreen, NotificationDetailScreen } from "../screens/shared/SharedScreens";

const Stack  = createNativeStackNavigator();
const Tab    = createBottomTabNavigator();

const NO_HEADER = { headerShown: false };

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={NO_HEADER}>
      <Stack.Screen name="Login"           component={LoginScreen} />
      <Stack.Screen name="Register"        component={RegisterScreen} />
      <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
    </Stack.Navigator>
  );
}

// ── SuperAdmin Tab Navigator ──────────────────────────────────────────────────
function SuperAdminTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabs {...props} />} screenOptions={NO_HEADER}>
      <Tab.Screen name="SuperHome"      component={SuperHomeScreen} />
      <Tab.Screen name="SuperOrgs"      component={SuperOrgsScreen} />
      <Tab.Screen name="SuperApprovals" component={SuperApprovalsScreen} />
      <Tab.Screen name="Notifications"  component={NotificationsScreen} />
      <Tab.Screen name="Broadcast"      component={BroadcastScreen} />
      <Tab.Screen name="ChatBot"        component={ChatBotScreen} />
      <Tab.Screen name="Profile"        component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Admin Tab Navigator ───────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabs {...props} />} screenOptions={NO_HEADER}>
      <Tab.Screen name="AdminHome"      component={AdminHomeScreen} />
      <Tab.Screen name="AdminApprovals" component={AdminApprovalsScreen} />
      <Tab.Screen name="AdminFleet"     component={AdminFleetScreen} />
      <Tab.Screen name="AdminRoutes"    component={AdminRoutesScreen} />
      <Tab.Screen name="AdminUsers"     component={AdminUsersScreen} />
      <Tab.Screen name="Notifications"  component={NotificationsScreen} />
      <Tab.Screen name="Broadcast"      component={BroadcastScreen} />
      <Tab.Screen name="ChatBot"        component={ChatBotScreen} />
      <Tab.Screen name="Profile"        component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Driver Tab Navigator ──────────────────────────────────────────────────────
function DriverTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabs {...props} />} screenOptions={NO_HEADER}>
      <Tab.Screen name="DriverHome"    component={DriverHomeScreen} />
      <Tab.Screen name="DriverTrip"    component={DriverTripScreen} />
      <Tab.Screen name="Tracking"      component={TrackingScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="ChatBot"       component={ChatBotScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Passenger Tab Navigator (school / college / employee) ─────────────────────
function PassengerTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabs {...props} />} screenOptions={NO_HEADER}>
      <Tab.Screen name="PassengerHome" component={PassengerHomeScreen} />
      <Tab.Screen name="Tracking"      component={TrackingScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="SOS"           component={SOSScreen} />
      <Tab.Screen name="ChatBot"       component={ChatBotScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Role router ───────────────────────────────────────────────────────────────
function AppTabs() {
  const { currentUser } = useApp();
  switch (currentUser?.role) {
    case "superadmin": return <SuperAdminTabs />;
    case "admin":      return <AdminTabs />;
    case "driver":     return <DriverTabs />;
    default:           return <PassengerTabs />;
  }
}

// ── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { currentUser, loading } = useApp();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1565C0" }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={NO_HEADER}>
        {currentUser ? (
          <>
            <Stack.Screen name="App" component={AppTabs} />
            <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
