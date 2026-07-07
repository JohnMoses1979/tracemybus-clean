// src/services/pushNotifications.js
// Expo push notification helper for TraceMyBus.
//
// Important:
// - Android remote push notifications do NOT work in Expo Go from SDK 53+.
// - This file safely skips push-token registration in Expo Go, so your app will not break.
// - Real Android tray push notifications work in a Development Build / APK after `eas init`.

import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    Constants?.manifest2?.extra?.eas?.projectId ||
    null
  );
}

function isAndroidExpoGo() {
  return Platform.OS === "android" && Constants?.appOwnership === "expo";
}

function getNotificationsModule() {
  try {
    // Dynamic require is intentional. It prevents Expo Go Android remote-push warnings
    // from breaking the app while still allowing development builds/APKs to register.
    // eslint-disable-next-line global-require
    return require("expo-notifications");
  } catch (error) {
    console.log("expo-notifications not available:", error?.message || error);
    return null;
  }
}

function setupNotificationHandler(Notifications) {
  if (!Notifications?.setNotificationHandler) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "web") {
      return {
        ok: false,
        token: "",
        msg: "Push notifications are skipped on web.",
      };
    }

    if (!Device.isDevice) {
      return {
        ok: false,
        token: "",
        msg: "Push notifications need a real Android/iOS device.",
      };
    }

    if (isAndroidExpoGo()) {
      return {
        ok: false,
        token: "",
        msg: "Android tray push notifications are skipped in Expo Go. Use a development build/APK for real push notifications.",
      };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return {
        ok: false,
        token: "",
        msg: "Push token skipped: EAS projectId missing. Run `eas init` before APK/development build push testing.",
      };
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return {
        ok: false,
        token: "",
        msg: "expo-notifications module is not available.",
      };
    }

    setupNotificationHandler(Notifications);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("bus-alerts", {
        name: "Bus Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2E7D32",
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;

    if (finalStatus !== "granted") {
      const permission = await Notifications.requestPermissionsAsync();
      finalStatus = permission.status;
    }

    if (finalStatus !== "granted") {
      return {
        ok: false,
        token: "",
        msg: "Notification permission was not granted.",
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data || "";

    if (!token) {
      return {
        ok: false,
        token: "",
        msg: "Expo push token was not generated.",
      };
    }

    return {
      ok: true,
      token,
      msg: "Push token generated.",
    };
  } catch (error) {
    console.log("push token registration error", error?.message || error);
    return {
      ok: false,
      token: "",
      msg: error?.message || "Push token registration failed.",
    };
  }
}

export async function showLocalNotificationAsync(title, body, data = {}) {
  try {
    if (Platform.OS === "web") return { ok: false };

    const Notifications = getNotificationsModule();
    if (!Notifications) return { ok: false };

    setupNotificationHandler(Notifications);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "TraceMyBus",
        body: body || "New alert",
        data,
        sound: "default",
      },
      trigger: null,
    });

    return { ok: true };
  } catch (error) {
    console.log("local notification error", error?.message || error);
    return { ok: false };
  }
}
