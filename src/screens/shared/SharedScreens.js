import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { appAlert, appConfirm } from "../../utils/alerts";
import { useApp } from "../../context/AppContext";
import { C, ROLE_MAP } from "../../constants/theme";
import { Card, InfoRow, SectionHeader, Chip, Btn, EmptyState, Avatar, SwitchRow } from "../../components/ui/index";
import { KeyboardScroll } from "../../components/ui/KeyboardScroll";
import { SubHeader } from "../../components/Header";
import { pageStyles } from "../../constants/layout";
import { routeForUser, driverForRoute, childrenForUser, makeId } from "../../utils/helpers";
import { api } from "../../services/api";

function cleanPhoneInput(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileField MUST be outside ProfileScreen to avoid keyboard-dismiss bug.
// If defined inside, every keystroke re-renders parent → component type changes
// → React unmounts TextInput → keyboard closes.
// ─────────────────────────────────────────────────────────────────────────────
function ProfileField({ label, value, onChange, editing, staticValue, keyboardType, maxLength }) {
  return (
    <View style={S.fieldCard}>
      <Text style={S.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={S.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholderTextColor={C.mutedLight}
          keyboardType={keyboardType || "default"}
          maxLength={maxLength}
          autoCorrect={false}
        />
      ) : (
        <Text style={S.fieldValue}>{staticValue ?? value ?? "—"}</Text>
      )}
    </View>
  );
}

function StaticField({ label, value }) {
  return (
    <View style={S.fieldCard}>
      <Text style={S.fieldLabel}>{label}</Text>
      <Text style={S.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function PasswordInput({ value, onChangeText, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={S.resetPasswordWrap}>
      <TextInput
        style={S.resetPasswordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.mutedLight}
        secureTextEntry={!visible}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <TouchableOpacity style={S.resetPasswordToggle} onPress={() => setVisible((prev) => !prev)}>
        <Text style={S.resetPasswordToggleText}>{visible ? "Hide" : "View"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PickupPointField({ value, onChange, editing, route }) {
  const pickupStops = route?.stops?.slice(0, -1) || [];

  if (!editing) {
    return <StaticField label="Pickup Point" value={value} />;
  }

  if (pickupStops.length === 0) {
    return (
      <ProfileField
        label="Pickup Point"
        value={value}
        onChange={onChange}
        editing={editing}
      />
    );
  }

  return (
    <View style={S.fieldCard}>
      <Text style={S.fieldLabel}>Pickup Point</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {pickupStops.map((stopName) => {
          const active = value === stopName;
          return (
            <TouchableOpacity
              key={stopName}
              onPress={() => onChange(stopName)}
              style={[S.pickupPill, active && S.pickupPillActive]}
            >
              <Text style={[S.pickupPillText, active && S.pickupPillTextActive]}>📍 {stopName}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={[S.muted, { marginTop: 6, fontSize: 11 }]}>Select from your assigned route pickup stops.</Text>
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Notifications / Alerts ───────────────────────────────────────────────────
export function NotificationsScreen({ navigation }) {
  const { currentUser, notifications = {}, markRead, markAllRead, refreshData, respondToSos, resolveSos } = useApp();

  useEffect(() => {
    if (!currentUser?.id) return;

    refreshData?.(currentUser);

    const unsubscribe = navigation?.addListener?.("focus", () => {
      refreshData?.(currentUser);
    });

    // Refresh while screen is open so messages from another device appear.
    const timer = setInterval(() => {
      refreshData?.(currentUser);
    }, 8000);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      clearInterval(timer);
    };
  }, [currentUser?.id, navigation, refreshData]);

  if (!currentUser) {
    return (
      <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
        <View style={pageStyles.blueTop}>
          <SubHeader title="Alerts" subtitle="Login required" />
        </View>
        <View style={pageStyles.roundBody}>
          <EmptyState icon="🔒" title="Login required" sub="Please login again to see alerts." />
        </View>
      </ScrollView>
    );
  }

  const items = Array.isArray(notifications[currentUser.id]) ? notifications[currentUser.id] : [];
  const unread = items.filter((n) => !n.read).length;
  const canSendMessage = currentUser.role === "superadmin" || currentUser.role === "admin";
  const canHandleSos = ["admin", "driver", "superadmin"].includes(currentUser.role);

  const isSosNotification = (item) => {
    const type = String(item?.type || item?.extra?.type || "").toLowerCase();
    const title = String(item?.title || "").toLowerCase();
    return type.includes("sos") || title.includes("sos") || !!item?.extra?.sosId;
  };

  const sosStatus = (item) => String(item?.extra?.sosStatus || item?.extra?.status || item?.extra?.sos_status || "open").toLowerCase();

  const respondSosNow = async (item) => {
    const sosId = item?.extra?.sosId;
    if (!sosId) {
      appAlert("SOS", "SOS ID not found for this alert.");
      return;
    }
    await respondToSos?.(sosId, "Help is on the way. Please stay safe.");
    refreshData?.(currentUser);
  };

  const resolveSosNow = async (item) => {
    const sosId = item?.extra?.sosId;
    if (!sosId) {
      appAlert("SOS", "SOS ID not found for this alert.");
      return;
    }
    await resolveSos?.(sosId, "SOS has been resolved.");
    refreshData?.(currentUser);
  };

  const openMessage = () => {
    if (navigation?.navigate) navigation.navigate("Broadcast");
  };

  const openNotification = (item) => {
    if (!item) return;
    markRead?.(currentUser.id, item.id);
    if (navigation?.navigate) {
      navigation.navigate("NotificationDetail", { item });
    }
  };

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader
          title="Alerts"
          subtitle={unread > 0 ? `${unread} unread · message feed` : "Message feed"}
        />
      </View>

      <View style={pageStyles.roundBody}>
        {canSendMessage && (
          <Btn
            title="📩  Send Message"
            color={currentUser.role === "superadmin" ? C.dangerDark : C.purple}
            onPress={openMessage}
          />
        )}

        <Card style={S.liveInfoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Messages & Alerts</Text>
              <Text style={S.muted}>Messages, route updates, SOS and pickup alerts appear here.</Text>
            </View>
            <Chip label={unread > 0 ? `${unread} unread` : "Live"} type={unread > 0 ? "red" : "green"} />
          </View>
        </Card>

        {unread > 0 && (
          <TouchableOpacity style={S.markAllBtn} onPress={() => markAllRead(currentUser.id)}>
            <Text style={S.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        {items.length === 0 ? (
          <EmptyState icon="🔕" title="No alerts yet" sub="New messages and trip alerts will appear here." />
        ) : items.map((item) => {
          const isMessage = ["message", "broadcast"].includes(String(item.type || "").toLowerCase()) ||
            String(item.title || "").toLowerCase().includes("broadcast");
          const cardColor = isMessage ? C.purple : C.primary;
          const displayTitle = isMessage ? "Message" : (item.title || "Alert");
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => openNotification(item)}
              activeOpacity={0.85}
            >
              <Card style={[S.notifCard, !item.read && { borderLeftWidth: 4, borderLeftColor: cardColor }]}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{isMessage ? "📩" : (item.icon || "🔔")}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <Text style={[S.cardTitle, { fontSize: 14, flexShrink: 1 }]}>{displayTitle}</Text>
                    {isMessage && <Chip label="Message" type="purple" />}
                  </View>

                  <Text style={isMessage ? S.broadcastBody : S.muted}>{item.body}</Text>

                  <View style={S.notifFooter}>
                    <Text style={[S.muted, { fontSize: 10, flex: 1 }]}>{item.date ? `${item.date} · ${item.time}` : item.time}</Text>
                    {!item.read ? <Text style={S.newTag}>NEW</Text> : <Text style={S.readTag}>READ</Text>}
                  </View>

                  {canHandleSos && isSosNotification(item) && sosStatus(item) !== "resolved" ? (
                    <View style={S.sosActionRow}>
                      <TouchableOpacity
                        style={[S.sosSmallBtn, { backgroundColor: C.warning }]}
                        onPress={() => respondSosNow(item)}
                      >
                        <Text style={S.sosSmallBtnText}>Respond</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[S.sosSmallBtn, { backgroundColor: C.success }]}
                        onPress={() => resolveSosNow(item)}
                      >
                        <Text style={S.sosSmallBtnText}>Resolve</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Message Composer ────────────────────────────────────────────────────────
export function BroadcastScreen({ navigation }) {
  const { currentUser, sendBroadcastMessage, getBroadcastInfo } = useApp();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const info = getBroadcastInfo ? getBroadcastInfo() : { ids: [] };
  const canSendMessage = currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const goToNotifications = () => {
    const routeNames = navigation?.getState?.()?.routeNames || [];
    if (routeNames.includes("Notifications")) {
      navigation.navigate("Notifications");
    } else {
      navigation?.getParent?.()?.navigate?.("Notifications");
    }
  };

  const sendNow = async () => {
    if (sending) return;

    const text = String(message || "").trim();
    if (!text) {
      appAlert("Message Required", "Please type a message before sending.");
      return;
    }

    try {
      setSending(true);
      const result = await sendBroadcastMessage(text);
      if (result?.ok) {
        setMessage("");
        goToNotifications();
      } else {
        appAlert("Message Failed", result?.msg || "Could not send message.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardScroll style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={pageStyles.blueTop}>
        <SubHeader title="Send Message" subtitle="Type and send your message" />
      </View>

      <View style={pageStyles.roundBody}>
        {!canSendMessage ? (
          <EmptyState icon="🔒" title="Access denied" sub="Only Super Admin and Admin can send messages." />
        ) : (
          <>
            <SectionHeader title="Type Message" />
            <Card>
              <TextInput
                style={S.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Enter message here..."
                placeholderTextColor={C.mutedLight}
                multiline
                textAlignVertical="top"
              />
            </Card>

            <Btn
              title={sending ? "Sending..." : "📩  Send Message"}
              color={currentUser?.role === "superadmin" ? C.dangerDark : C.purple}
              onPress={sendNow}
              disabled={sending || !message.trim()}
            />
            <Btn title="Cancel" color={C.muted} onPress={() => navigation.goBack()} />
          </>
        )}
      </View>
    </KeyboardScroll>
  );
}

// ── SOS ───────────────────────────────────────────────────────────────────────
export function SOSScreen() {
  const { currentUser, users, routes, sendPassengerSos } = useApp();
  const route  = routeForUser(currentUser, routes);
  const driver = driverForRoute(route, users);
  const call   = (n) => Linking.openURL(`tel:${n}`).catch(() => appAlert("Call", n));

  const admin = users.find((u) => u.role === "admin" && u.orgId === (route?.orgId || currentUser?.orgId));

  const contacts = [
    ...(driver?.phone ? [{ icon: "🚗", label: "Driver", num: driver.phone, name: driver.name || "Driver" }] : []),
    ...(admin?.phone ? [{ icon: "🏢", label: "Transport Admin", num: admin.phone, name: admin.name || "Organisation Admin" }] : []),
    { icon: "🚑", label: "Ambulance", num: "108", name: "Emergency" },
    { icon: "🚔", label: "Police", num: "100", name: "Emergency" },
  ];

  return (
    <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
      <View style={[pageStyles.blueTop, { backgroundColor: C.dangerDark }]}>
        <SubHeader title="Emergency SOS" subtitle="Safety & Emergency" />
      </View>
      <View style={pageStyles.roundBody}>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ color: C.muted, fontSize: 14, fontWeight: "700", marginBottom: 18, textAlign: "center" }}>
            Tap the SOS button to alert admin and driver immediately
          </Text>
          <TouchableOpacity style={S.sosBtn}
            onPress={() => { Vibration.vibrate([0, 200, 100, 200]); sendPassengerSos(route?.id, currentUser.id); }}>
            <Text style={{ color: C.white, fontSize: 36, fontWeight: "900" }}>SOS</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 4 }}>Tap to alert</Text>
          </TouchableOpacity>
        </View>
        <SectionHeader title="Emergency Contacts" />
        {contacts.map((e) => (
          <Card key={e.label} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>{e.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>{e.label}</Text>
                <Text style={S.muted}>{e.name} · {e.num}</Text>
              </View>
              <TouchableOpacity style={S.callBtn} onPress={() => call(e.num)}>
                <Text style={{ color: C.white, fontWeight: "900", fontSize: 12 }}>📞 Call</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { currentUser, routes, orgs, logout, updateCurrentUser } = useApp();
  const route    = routeForUser(currentUser, routes);
  const org      = orgs.find((o) => o.id === currentUser.orgId);
  const roleInfo = ROLE_MAP[currentUser.role];

  const [editing,    setEditing]    = useState(false);
  const [name,       setName]       = useState(currentUser.name);
  const [phone,      setPhone]      = useState(currentUser.phone);
  const [email,      setEmail]      = useState(currentUser.email      || "");
  const [childName,  setChildName]  = useState(currentUser.childName  || "");
  const [childClass, setChildClass] = useState(currentUser.childClass || "");
  const [childRoll,  setChildRoll]  = useState(currentUser.childRollNo|| "");
  const [children,   setChildren]   = useState(() => {
    const existing = childrenForUser(currentUser);
    return existing.length > 0 ? existing : [{ id: makeId("child"), name: "", className: "", rollNo: "" }];
  });
  const [dept,       setDept]       = useState(currentUser.department  || "");
  const [empId,      setEmpId]      = useState(currentUser.empId       || "");
  const [shift,      setShift]      = useState(currentUser.shiftTime   || "");
  const [pickup,     setPickup]     = useState(currentUser.stop        || "");
  const [license,    setLicense]    = useState(currentUser.license     || "");
  const [exp,        setExp]        = useState(currentUser.experience  || "");
  const [notifyOn, setNotifyOn] = useState(currentUser?.notificationEnabled !== false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.profilePhoto || "");

  const saveProfilePhoto = async (asset) => {
    if (!asset) return;

    const imageValue = asset.base64
      ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
      : asset.uri;

    if (!imageValue) {
      appAlert("Photo Error", "Could not read selected image. Please try again.");
      return;
    }

    try {
      setPhotoSaving(true);
      setProfilePhoto(imageValue);

      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(`TMB_PROFILE_PHOTO_${currentUser?.id}`, imageValue);
      } catch (_) {}

      const result = await updateCurrentUser({
        ...currentUser,
        profilePhoto: imageValue,
      });

      if (result?.ok) {
        appAlert(
          "Profile Photo Updated ✅",
          result.localOnly
            ? "Photo updated on this device. Backend rejected the image size, so it is saved locally."
            : "Your profile photo has been saved."
        );
      }
    } finally {
      setPhotoSaving(false);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        appAlert("Gallery Permission Needed", "Please allow gallery access to upload a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.25,
        base64: true,
      });

      if (!result.canceled) await saveProfilePhoto(result.assets?.[0]);
    } catch (error) {
      appAlert("Photo Error", error?.message || "Could not upload photo.");
    }
  };

  const captureProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        appAlert("Camera Permission Needed", "Please allow camera access to capture a profile photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.25,
        base64: true,
      });

      if (!result.canceled) await saveProfilePhoto(result.assets?.[0]);
    } catch (error) {
      appAlert("Camera Error", error?.message || "Could not capture photo.");
    }
  };

  const removeProfilePhoto = async () => {
    try {
      setPhotoSaving(true);
      setProfilePhoto("");

      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem(`TMB_PROFILE_PHOTO_${currentUser?.id}`);
      } catch (_) {}

      const result = await updateCurrentUser({
        ...currentUser,
        profilePhoto: "",
      });

      if (result?.ok) {
        appAlert("Photo Removed", "Profile photo has been removed.");
      }
    } finally {
      setPhotoSaving(false);
    }
  };

  useEffect(() => {
    setNotifyOn(currentUser?.notificationEnabled !== false);
  }, [currentUser?.notificationEnabled]);

  useEffect(() => {
    let mounted = true;

    async function loadSavedPhoto() {
      const serverPhoto = currentUser?.profilePhoto || "";
      if (serverPhoto) {
        setProfilePhoto(serverPhoto);
        return;
      }

      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const savedPhoto = await AsyncStorage.getItem(`TMB_PROFILE_PHOTO_${currentUser?.id}`);
        if (mounted && savedPhoto) setProfilePhoto(savedPhoto);
      } catch (_) {}
    }

    loadSavedPhoto();
    return () => { mounted = false; };
  }, [currentUser?.id, currentUser?.profilePhoto]);

  const toggleAppNotifications = async (value) => {
    setNotifyOn(value);
    const result = await updateCurrentUser({
      ...currentUser,
      notificationEnabled: value,
    });

    if (!result?.ok) {
      setNotifyOn(!value);
      return;
    }

    appAlert(
      value ? "Notifications Enabled ✅" : "Notifications Disabled",
      value
        ? "You will receive app alerts and messages."
        : "You will not receive new app alerts or messages until you enable notifications again."
    );
  };

  const updateChild = (id, field, value) => {
    setChildren((prev) => prev.map((child) => child.id === id ? { ...child, [field]: value } : child));
  };

  const addChild = () => {
    setChildren((prev) => [...prev, { id: makeId("child"), name: "", className: "", rollNo: "" }]);
  };

  const deleteChild = (id) => {
    setChildren((prev) => prev.length <= 1 ? prev : prev.filter((child) => child.id !== id));
  };

  const save = () => {
    const cleanPhone = cleanPhoneInput(phone);
    if (cleanPhone.length !== 10) {
      appAlert("Invalid Phone", "Phone number must be exactly 10 digits.");
      return;
    }
    const inits = name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
    const cleanChildren = children
      .map((child) => ({
        id: child.id || makeId("child"),
        name: String(child.name || "").trim(),
        className: String(child.className || "").trim(),
        rollNo: String(child.rollNo || "").trim(),
      }))
      .filter((child) => child.name || child.className || child.rollNo);
    const finalChildren = cleanChildren.length > 0 ? cleanChildren : [{ id: makeId("child"), name: "", className: "", rollNo: "" }];

    updateCurrentUser({
      ...currentUser, name, phone: cleanPhone, email, initials: inits,
      children: finalChildren,
      childName: finalChildren[0]?.name || childName,
      childClass: finalChildren[0]?.className || childClass,
      childRollNo: finalChildren[0]?.rollNo || childRoll,
      department: dept, empId, shiftTime: shift, stop: pickup, license, experience: exp,
      notificationEnabled: notifyOn,
      profilePhoto: profilePhoto || currentUser.profilePhoto || "",
    });
    setChildName(finalChildren[0]?.name || "");
    setChildClass(finalChildren[0]?.className || "");
    setChildRoll(finalChildren[0]?.rollNo || "");
    setChildren(finalChildren);
    setEditing(false);
    appAlert("Saved ✅", "Profile updated.");
  };

  const resetProfilePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      appAlert("Missing Fields", "Please enter current password, new password and confirm password.");
      return;
    }
    if (newPassword.length < 4) {
      appAlert("Weak Password", "New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      appAlert("Password Mismatch", "New password and confirm password must be same.");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.resetProfilePassword(currentPassword, newPassword);
      appAlert("Password Updated ✅", "Your password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowResetPassword(false);
    } catch (error) {
      appAlert("Reset Failed", error?.message || "Could not update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    // Use KeyboardScroll when editing so inputs are never hidden under keyboard
    editing ? (
      <View style={[pageStyles.page, { backgroundColor: C.header }]}>
        <View style={pageStyles.blueTop}>
          <SubHeader title="Edit Profile" subtitle={roleInfo?.label} />
        </View>
        <KeyboardScroll style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
          contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {renderProfileContent()}
        </KeyboardScroll>
      </View>
    ) : (
      <ScrollView style={pageStyles.page} showsVerticalScrollIndicator={false}>
        <View style={pageStyles.blueTop}>
          <SubHeader title="My Profile" subtitle={roleInfo?.label} />
        </View>
        <View style={pageStyles.roundBody}>
          {renderProfileContent()}
        </View>
      </ScrollView>
    )
  );

  function renderProfileContent() {
    const avatarInitials = name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
    return (
      <>
        <LinearGradient
          colors={["rgba(46,184,114,0.22)", C.card, C.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.profileTop}
        >
          <View style={S.profileGlow} />
          <Avatar user={{ ...currentUser, initials: avatarInitials, profilePhoto }} size={92} />
          <Text style={S.profileName}>{name}</Text>
          <Chip label={roleInfo?.label || currentUser.role} type="blue" />
          <Text style={S.profileId}>ID: {currentUser.id}</Text>

          <View style={S.photoActionRow}>
            <TouchableOpacity
              style={[S.photoActionBtn, photoSaving && { opacity: 0.5 }]}
              onPress={captureProfilePhoto}
              disabled={photoSaving}
              activeOpacity={0.85}
            >
              <Text style={S.photoActionText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.photoActionBtn, photoSaving && { opacity: 0.5 }]}
              onPress={pickProfilePhoto}
              disabled={photoSaving}
              activeOpacity={0.85}
            >
              <Text style={S.photoActionText}>🖼️ Gallery</Text>
            </TouchableOpacity>
            {profilePhoto ? (
              <TouchableOpacity
                style={[S.photoRemoveBtn, photoSaving && { opacity: 0.5 }]}
                onPress={() => appConfirm("Remove Photo", "Remove your profile photo?", removeProfilePhoto, { confirmText: "Remove", destructive: true })}
                disabled={photoSaving}
                activeOpacity={0.85}
              >
                <Text style={S.photoRemoveText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={S.profileMiniGrid}>
            <View style={S.profileMiniCard}>
              <Text style={S.profileMiniLabel}>Mobile</Text>
              <Text style={S.profileMiniValue}>{phone || "—"}</Text>
            </View>
            {currentUser.role !== "superadmin" ? (
              <View style={S.profileMiniCard}>
                <Text style={S.profileMiniLabel}>Organisation</Text>
                <Text style={S.profileMiniValue} numberOfLines={1}>{org?.name || currentUser.org || "—"}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <SectionHeader title="Personal Information" />
        <ProfileField label="Full Name"    value={name}  onChange={setName}  editing={editing} />
        <ProfileField
          label="Phone Number"
          value={phone}
          onChange={(value) => setPhone(cleanPhoneInput(value))}
          editing={editing}
          keyboardType="phone-pad"
          maxLength={10}
        />
        <ProfileField label="Email"        value={email} onChange={setEmail} editing={editing} />
        {currentUser.role !== "superadmin" ? (
          <StaticField label="Organisation" value={org?.name || currentUser.org} />
        ) : null}
        {route && <StaticField label="Route" value={`${route.name}  ·  ${route.busNo}`} />}

        {(currentUser.role === "school" || currentUser.role === "college") && (
          <>
            <SectionHeader
              title="Children Details"
              action={editing ? "＋ Add Child" : undefined}
              onAction={editing ? addChild : undefined}
            />

            {children.map((child, index) => (
              <View key={child.id} style={S.childCard}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={S.childTitle}>Child {index + 1}</Text>
                  {editing && children.length > 1 ? (
                    <TouchableOpacity onPress={() => deleteChild(child.id)} style={S.deleteChildBtn}>
                      <Text style={S.deleteChildText}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <ProfileField
                  label="Child's Name"
                  value={child.name}
                  onChange={(value) => updateChild(child.id, "name", value)}
                  editing={editing}
                />
                <ProfileField
                  label="Class / Course"
                  value={child.className}
                  onChange={(value) => updateChild(child.id, "className", value)}
                  editing={editing}
                />
                <ProfileField
                  label="Roll / Adm. No"
                  value={child.rollNo}
                  onChange={(value) => updateChild(child.id, "rollNo", value)}
                  editing={editing}
                />
              </View>
            ))}

            <PickupPointField value={pickup} onChange={setPickup} editing={editing} route={route} />
          </>
        )}
        {currentUser.role === "employee" && (
          <>
            <SectionHeader title="Work Details" />
            <ProfileField label="Department"  value={dept}  onChange={setDept}  editing={editing} />
            <ProfileField label="Employee ID" value={empId} onChange={setEmpId} editing={editing} />
            <ProfileField label="Shift Time"  value={shift} onChange={setShift} editing={editing} />
            <PickupPointField value={pickup} onChange={setPickup} editing={editing} route={route} />
          </>
        )}
        {currentUser.role === "driver" && (
          <>
            <SectionHeader title="Driver Details" />
            <ProfileField label="License Number" value={license} onChange={setLicense} editing={editing} />
            <ProfileField label="Experience"     value={exp}     onChange={setExp}     editing={editing} />
            <StaticField  label="Assigned Bus"   value={route?.busNo} />
          </>
        )}

        <SectionHeader title="Notification Settings" />
        <Card>
          <SwitchRow
            title="App Notifications"
            value={notifyOn}
            onChange={toggleAppNotifications}
          />
          <Text style={[S.muted, { marginTop: 8 }]}>
            Turn this off if you do not want app messages, trip alerts, SOS updates or pickup alerts.
          </Text>
        </Card>

        <SectionHeader title="Account" />
        {editing ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn title="💾  Save"  color={C.success} onPress={save} />
            <Btn title="Cancel"   color={C.muted}   onPress={() => setEditing(false)} />
          </View>
        ) : (
          <Btn title="✏️  Edit Profile" color={C.primary} onPress={() => setEditing(true)} />
        )}

        <View style={{ height: 8 }} />
        <Btn
          title={showResetPassword ? "Hide Reset Password" : "🔐  Reset Password"}
          color={C.accent}
          onPress={() => setShowResetPassword((prev) => !prev)}
        />

        {showResetPassword ? (
          <Card style={S.resetCard}>
            <Text style={S.cardTitle}>Reset Password</Text>
            <Text style={[S.muted, { marginTop: 3, marginBottom: 10 }]}>Enter current password, then set a new password.</Text>

            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
            />
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
            />
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
            />
            <Btn
              title={passwordLoading ? "Updating..." : "Update Password"}
              color={C.success}
              onPress={resetProfilePassword}
              disabled={passwordLoading}
            />
          </Card>
        ) : null}

        <View style={{ height: 8 }} />
        <Btn title="🚪  Logout" color={C.danger} onPress={() =>
          appConfirm("Logout", "Are you sure?", logout, { confirmText: "Logout", destructive: true })} />
      </>
    );
  }
}


// ── Notification Detail Screen ────────────────────────────────────────────────
export function NotificationDetailScreen({ route, navigation }) {
  const { currentUser, respondToSos, resolveSos, refreshData } = useApp();
  const item = route?.params?.item || {};

  const isMessage = ["message", "broadcast"].includes(String(item.type || "").toLowerCase()) ||
    String(item.title || "").toLowerCase().includes("broadcast");
  const isSos = String(item.type || item?.extra?.type || "").toLowerCase().includes("sos") ||
    String(item.title || "").toLowerCase().includes("sos") || !!item?.extra?.sosId;
  const canHandleSos = ["admin", "driver", "superadmin"].includes(currentUser?.role);
  const sosResolved = String(item?.extra?.sosStatus || item?.extra?.status || "open").toLowerCase() === "resolved";

  const displayTitle = isMessage ? "Message" : (item.title || "Alert");
  const body = item.body || item.message || "No message found.";
  const headerBg = isSos ? C.danger : isMessage ? C.header : C.header;

  const respondSos = async () => {
    const sosId = item?.extra?.sosId;
    if (!sosId) return;
    await respondToSos?.(sosId, "Help is on the way. Please stay safe.");
    refreshData?.(currentUser);
    navigation.goBack();
  };

  const resolveSosNow = async () => {
    const sosId = item?.extra?.sosId;
    if (!sosId) return;
    await resolveSos?.(sosId, "SOS has been resolved.");
    refreshData?.(currentUser);
    navigation.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: headerBg, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
          {item.date ? `${item.date} · ${item.time}` : item.time}
        </Text>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: "900" }}>{displayTitle}</Text>
      </View>

      <View style={{ padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 36, marginRight: 12 }}>{isMessage ? "📩" : (item.icon || "🔔")}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "900" }}>{displayTitle}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{item.date ? `${item.date} · ${item.time}` : item.time}</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", lineHeight: 24 }}>{body}</Text>
          </View>
        </Card>

        {isSos && item?.extra?.routeName && (
          <Card style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.danger }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "900", marginBottom: 6 }}>SOS Details</Text>
            <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>Route: {item.extra.routeName}</Text>
            {item.extra.sender && <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4 }}>From: {item.extra.sender} ({item.extra.senderRole})</Text>}
            {item.extra.sosStatus && <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4 }}>Status: {String(item.extra.sosStatus).toUpperCase()}</Text>}
          </Card>
        )}

        {canHandleSos && isSos && !sosResolved && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <Btn title="✅ Respond" color={C.warning} onPress={respondSos} />
            <Btn title="✔ Resolve" color={C.success} onPress={resolveSosNow} />
          </View>
        )}

        <Btn title="← Back to Alerts" color={C.primary} onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  cardTitle:   { color: C.text, fontSize: 15, fontWeight: "900" },
  muted:       { color: C.muted, fontSize: 12, fontWeight: "600" },
  liveInfoCard:{ borderLeftWidth: 4, borderLeftColor: C.success, marginBottom: 10 },
  notifCard:   { flexDirection: "row", alignItems: "flex-start", padding: 14, marginBottom: 8 },
  broadcastBody:{ color: C.text, fontSize: 14, fontWeight: "800", lineHeight: 20, marginTop: 8 },
  notifFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 8 },
  openTag:     { backgroundColor: C.primaryLight, color: C.accent, fontSize: 9, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  newTag:      { backgroundColor: C.dangerLight, color: C.dangerDark, fontSize: 9, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  readTag:     { backgroundColor: C.primaryLight, color: C.muted, fontSize: 9, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  unreadDot:   { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary, marginLeft: 8, marginTop: 4 },
  markAllBtn:  { alignSelf: "flex-end", marginBottom: 8 },
  markAllText: { color: C.accent, fontWeight: "900", fontSize: 12 },
  audienceCard:{ borderLeftWidth: 4, borderLeftColor: C.purple },
  messageInput:{ minHeight: 150, color: C.text, fontSize: 14, fontWeight: "700", lineHeight: 21 },
  sosBtn:      { width: 148, height: 148, borderRadius: 74, backgroundColor: C.danger, alignItems: "center", justifyContent: "center", elevation: 10 },
  sosActionRow:{ flexDirection: "row", gap: 8, marginTop: 10 },
  sosSmallBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  sosSmallBtnText:{ color: C.white, fontSize: 12, fontWeight: "900" },
  callBtn:     { backgroundColor: C.success, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  profileTop:  {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  profileGlow: {
    position: "absolute",
    top: -46,
    right: -46,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(46,184,114,0.18)",
  },
  profileName: { color: C.text, fontSize: 24, fontWeight: "900", marginTop: 12, marginBottom: 8, letterSpacing: 0.2 },
  profileId: { color: C.mutedLight, marginTop: 8, fontSize: 11, fontWeight: "800" },
  photoActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  photoActionBtn: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(46,184,114,0.28)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoActionText: { color: C.primary, fontSize: 12, fontWeight: "900" },
  photoRemoveBtn: {
    backgroundColor: C.dangerLight,
    borderWidth: 1,
    borderColor: "rgba(239,107,115,0.28)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoRemoveText: { color: C.dangerDark, fontSize: 12, fontWeight: "900" },
  profileMiniGrid: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  profileMiniCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  profileMiniLabel: { color: C.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  profileMiniValue: { color: C.text, fontSize: 13, fontWeight: "900", marginTop: 5 },
  fieldCard:   {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 14,
    marginBottom: 10,
  },
  fieldLabel:  { color: C.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  fieldValue:  { color: C.text, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  fieldInput:  {
    borderWidth: 1,
    borderColor: "rgba(46,184,114,0.50)",
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
    marginTop: 2,
    fontWeight: "700",
  },
  resetCard:   { borderLeftWidth: 4, borderLeftColor: C.accent, marginTop: 8 },
  resetInput:  { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14,
                 paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.text, marginBottom: 8 },
  resetPasswordWrap:{
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    marginBottom: 10,
  },
  resetPasswordInput:{ flex: 1, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: C.text, fontWeight: "700" },
  resetPasswordToggle:{ paddingHorizontal: 13, paddingVertical: 12 },
  resetPasswordToggleText:{ color: C.accent, fontSize: 12, fontWeight: "900" },
  pickupPill:  { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, marginRight: 8, backgroundColor: C.card },
  pickupPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pickupPillText: { color: C.text, fontSize: 12, fontWeight: "800" },
  pickupPillTextActive: { color: C.white },
  childCard:   { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 12, marginBottom: 12 },
  childTitle:  { color: C.text, fontSize: 14, fontWeight: "900" },
  deleteChildBtn: { backgroundColor: C.dangerLight, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  deleteChildText:{ color: C.dangerDark, fontSize: 11, fontWeight: "900" },
});
