import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { appAlert } from "../../utils/alerts";
import { C, ROLES, ORG_TYPES } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { Btn } from "../../components/ui/index";
import { makeId } from "../../utils/helpers";
import { KeyboardScroll } from "../../components/ui/KeyboardScroll";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../services/api";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight || 30) : 44;
const TOP_PAD  = STATUS_H + 14;

const USER_ROLES = ROLES.filter((r) => !["admin", "superadmin"].includes(r.id));

function cleanPhoneInput(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: Input & Label MUST be defined outside the component.
// If defined inside, React recreates the component type on every render,
// unmounting and remounting the TextInput → keyboard dismisses after 1 letter.
// ─────────────────────────────────────────────────────────────────────────────
function FieldLabel({ text, required }) {
  return <Text style={S.label}>{text}{required ? " *" : ""}</Text>;
}

function FieldInput({ value, onChange, placeholder, keyboard, secure, maxLength }) {
  return (
    <TextInput
      style={S.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.mutedLight}
      keyboardType={keyboard || "default"}
      secureTextEntry={!!secure}
      maxLength={maxLength}
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
}

function PhoneInput({ value, onChange, placeholder }) {
  return (
    <FieldInput
      value={value}
      onChange={(nextValue) => onChange(cleanPhoneInput(nextValue))}
      placeholder={placeholder}
      keyboard="phone-pad"
      maxLength={10}
    />
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={S.passwordWrap}>
      <TextInput
        style={S.passwordInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.mutedLight}
        secureTextEntry={!visible}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <TouchableOpacity style={S.passwordToggle} onPress={() => setVisible((prev) => !prev)}>
        <Text style={S.passwordToggleText}>{visible ? "Hide" : "View"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={S.sectionLabel}>{text}</Text>;
}

function OtpInlineBox({
  otpValue,
  onOtpChange,
  otpSent,
  otpVerified,
  otpLoading,
  cooldown,
  onAction,
}) {
  const trimmed = String(otpValue || "").trim();
  const buttonText = otpLoading
    ? "Please wait..."
    : otpVerified
      ? "Verified ✅"
      : !otpSent
        ? "Send OTP"
        : trimmed.length > 0
          ? "Verify OTP"
          : cooldown > 0
            ? "Verify OTP"
            : "Resend OTP";

  return (
    <View style={S.otpBlock}>
      <View style={S.otpInlineRow}>
        <TextInput
          style={[S.input, S.otpInlineInput, (!otpSent || otpVerified) && S.otpDisabledInput]}
          value={otpValue}
          onChangeText={onOtpChange}
          placeholder={otpSent ? "Enter OTP" : "OTP"}
          placeholderTextColor={C.mutedLight}
          keyboardType="number-pad"
          maxLength={6}
          editable={otpSent && !otpVerified}
        />
        <TouchableOpacity
          style={[S.otpInlineBtn, (otpLoading || otpVerified) && S.disabledBtn]}
          disabled={otpLoading || otpVerified}
          onPress={onAction}
        >
          <Text style={S.otpInlineBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[S.otpHint, { color: otpVerified ? C.primary : C.muted }]}> 
        {otpVerified
          ? "Email verified successfully."
          : otpSent
            ? cooldown > 0
              ? `OTP sent to email. Resend available in ${cooldown}s.`
              : "Didn’t get OTP? Tap Resend OTP."
            : "Send OTP to verify this email address."}
      </Text>
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const navigation = useNavigation();
  const {
    orgs,
    routes,
    registerAdminRequest,
    registerUserRequest,
    refreshPublicRegistrationData,
  } = useApp();
  const [mode, setMode] = useState("choose");

  // ── Admin fields ────────────────────────────────────────────────────────
  const [adminName,  setAdminName]  = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass,  setAdminPass]  = useState("");
  const [adminConfirmPass, setAdminConfirmPass] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [adminOtpLoading, setAdminOtpLoading] = useState(false);
  const [adminOtpCooldown, setAdminOtpCooldown] = useState(0);
  const [orgName,    setOrgName]    = useState("");
  const [orgType,    setOrgType]    = useState("School");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPhone,   setOrgPhone]   = useState("");

  // ── User fields ─────────────────────────────────────────────────────────
  const [role,       setRole]       = useState("school");
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [email,      setEmail]      = useState("");
  const [pass,       setPass]       = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [orgId,      setOrgId]      = useState("");
  const [orgSearch,  setOrgSearch]  = useState("");
  const [routeId,    setRouteId]    = useState("");
  const [stop,       setStop]       = useState("");
  const [childName,  setChildName]  = useState("");
  const [childClass, setChildClass] = useState("");
  const [childRoll,  setChildRoll]  = useState("");
  const [children,   setChildren]   = useState([{ id: makeId("child"), name: "", className: "", rollNo: "" }]);
  const [dept,       setDept]       = useState("");
  const [empId,      setEmpId]      = useState("");
  const [shift,      setShift]      = useState("");
  const [license,    setLicense]    = useState("");
  const [exp,        setExp]        = useState("");

  const selectedOrg    = orgs.find((o) => o.id === orgId);
  const orgSearchText  = String(orgSearch || "").trim().toLowerCase();
  const searchedOrgs   = orgSearchText
    ? orgs.filter((o) =>
        String(o.name || "").toLowerCase().includes(orgSearchText) ||
        String(o.type || "").toLowerCase().includes(orgSearchText) ||
        String(o.address || "").toLowerCase().includes(orgSearchText)
      )
    : orgs;
  const filteredRoutes = routes.filter((r) => r.orgId === orgId);
  const selectedRoute  = filteredRoutes.find((r) => r.id === routeId);

  useEffect(() => {
    if (mode === "user") {
      refreshPublicRegistrationData?.();
    }
  }, [mode, refreshPublicRegistrationData]);

  const cleanPhone = cleanPhoneInput;
  const cleanEmail = (value) => String(value || "").trim().toLowerCase();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));

  useEffect(() => {
    if (adminOtpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setAdminOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [adminOtpCooldown]);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const validateEmailPhoneAndPassword = ({ emailValue, phoneValue, passwordValue, confirmValue }) => {
    if (cleanPhone(phoneValue).length !== 10) {
      appAlert("Invalid Phone", "Please enter a valid 10-digit phone number.");
      return false;
    }
    if (!isValidEmail(emailValue)) {
      appAlert("Invalid Email", "Please enter a valid email address.");
      return false;
    }
    if (passwordValue.length < 4) {
      appAlert("Weak Password", "Password must be at least 4 characters.");
      return false;
    }
    if (passwordValue !== confirmValue) {
      appAlert("Password Mismatch", "Password and confirm password must be same.");
      return false;
    }
    return true;
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

  const normalizedChildren = () => children
    .map((child) => ({
      id: child.id || makeId("child"),
      name: String(child.name || "").trim(),
      className: String(child.className || "").trim(),
      rollNo: String(child.rollNo || "").trim(),
    }))
    .filter((child) => child.name || child.className || child.rollNo);


  const sendOtpForEmail = async ({ emailValue, setSent, setVerified, setLoading, setCooldown }) => {
    const verifiedEmail = cleanEmail(emailValue);
    if (!isValidEmail(verifiedEmail)) {
      appAlert("Invalid Email", "Please enter a valid email address before sending OTP.");
      return;
    }

    try {
      setLoading(true);
      await api.sendRegistrationOtp(verifiedEmail);
      setSent(true);
      setVerified(false);
      setCooldown(30);
      appAlert("OTP Sent", `OTP sent to ${verifiedEmail}.`);
    } catch (error) {
      appAlert("OTP Failed", error?.message || "Unable to send OTP to email.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpForEmail = async ({ emailValue, otpValue, setVerified, setLoading }) => {
    const verifiedEmail = cleanEmail(emailValue);
    if (!isValidEmail(verifiedEmail) || !otpValue) {
      appAlert("OTP Required", "Please enter email address and OTP.");
      return;
    }

    try {
      setLoading(true);
      await api.verifyRegistrationOtp(verifiedEmail, otpValue);
      setVerified(true);
      appAlert("Verified ✅", "Email verified successfully.");
    } catch (error) {
      setVerified(false);
      appAlert("OTP Failed", error?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpAction = async ({
    emailValue,
    otpValue,
    otpSentValue,
    cooldownValue,
    setSent,
    setVerified,
    setLoading,
    setCooldown,
  }) => {
    const typedOtp = String(otpValue || "").trim();

    if (!otpSentValue) {
      await sendOtpForEmail({ emailValue, setSent, setVerified, setLoading, setCooldown });
      return;
    }

    if (typedOtp.length > 0) {
      await verifyOtpForEmail({ emailValue, otpValue: typedOtp, setVerified, setLoading });
      return;
    }

    if (cooldownValue <= 0) {
      await sendOtpForEmail({ emailValue, setSent, setVerified, setLoading, setCooldown });
      return;
    }

    appAlert("OTP Required", "Please enter the OTP sent to your email address.");
  };

  // ── Submit admin ────────────────────────────────────────────────────────
  const submitAdmin = async () => {
    if (!adminName || !adminPhone || !adminEmail || !adminPass || !adminConfirmPass || !orgName || !orgType) {
      appAlert("Missing Fields", "Please fill name, phone, email, password, confirm password and organisation details."); return;
    }
    if (!validateEmailPhoneAndPassword({
      emailValue: adminEmail, phoneValue: adminPhone, passwordValue: adminPass, confirmValue: adminConfirmPass,
    })) return;
    if (orgPhone && cleanPhone(orgPhone).length !== 10) {
      appAlert("Invalid Phone", "Organisation phone must be exactly 10 digits.");
      return;
    }
    if (!adminOtpVerified) {
      appAlert("Email Not Verified", "Please verify your email OTP before submitting.");
      return;
    }
    const registeredPhone = cleanPhone(adminPhone);
    const registeredEmail = cleanEmail(adminEmail);
    const result = await registerAdminRequest({
      role: "admin", name: adminName, phone: registeredPhone, email: registeredEmail,
      password: adminPass, orgName, orgType, orgAddress, orgPhone: cleanPhone(orgPhone),
    });
    if (result.ok) {
      navigation.navigate("WaitingApproval", {
        phone: registeredPhone,
        name: adminName,
        role: "admin",
        approvalType: "Organisation Admin",
      });
    } else appAlert("Error", result.msg);
  };

  // ── Submit user ─────────────────────────────────────────────────────────
  const submitUser = async () => {
    if (!name || !phone || !email || !pass || !confirmPass || !orgId || !routeId) {
      appAlert("Missing Fields", "Please fill name, phone, email, password, confirm password and select org + route."); return;
    }
    if (role !== "driver" && !stop) {
      appAlert("Pickup Point Required", "Please select your pickup point."); return;
    }
    if (!validateEmailPhoneAndPassword({
      emailValue: email, phoneValue: phone, passwordValue: pass, confirmValue: confirmPass,
    })) return;
    if (!otpVerified) {
      appAlert("Email Not Verified", "Please verify your email OTP before submitting.");
      return;
    }
    const finalChildren = (role === "school" || role === "college") ? normalizedChildren() : [];
    if ((role === "school" || role === "college") && finalChildren.length === 0) {
      appAlert("Child Required", "Please add at least one child detail.");
      return;
    }

    const registeredPhone = cleanPhone(phone);
    const registeredEmail = cleanEmail(email);
    const result = await registerUserRequest({
      role, name, phone: registeredPhone, email: registeredEmail, password: pass,
      orgId, orgName: selectedOrg?.name || "", routeId, stop,
      children: finalChildren,
      childName: finalChildren[0]?.name || childName,
      childClass: finalChildren[0]?.className || childClass,
      childRollNo: finalChildren[0]?.rollNo || childRoll,
      department: dept, empId, shiftTime: shift,
      license, experience: exp,
    });
    if (result.ok) {
      navigation.navigate("WaitingApproval", {
        phone: registeredPhone,
        name,
        role,
        approvalType: selectedOrg?.name || "Organisation",
      });
    } else appAlert("Error", result.msg);
  };

  // ── CHOOSE screen ────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <View style={S.root}>
        <StatusBar backgroundColor={C.header} barStyle="light-content" translucent />
        <KeyboardScroll>
          <View style={[S.heroSmall, { paddingTop: TOP_PAD }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
              <Text style={S.backArrow}>‹</Text>
              <Text style={S.backTxt}>Back to Login</Text>
            </TouchableOpacity>
            <Text style={S.heroTitle}>Register</Text>
            <Text style={S.heroSub}>What best describes you?</Text>
          </View>
          <View style={S.card}>
            <TouchableOpacity style={S.choiceCard} onPress={() => setMode("admin")}>
              <Text style={S.choiceIcon}>🏢</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.choiceTitle}>Register my Organisation</Text>
                <Text style={S.choiceSub}>School, College, or Company admin. Reviewed by SuperAdmin.</Text>
              </View>
              <Text style={{ fontSize: 20, color: C.muted }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.choiceCard, { marginTop: 12 }]} onPress={() => setMode("user")}>
              <Text style={S.choiceIcon}>👤</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.choiceTitle}>Student / Employee / Driver</Text>
                <Text style={S.choiceSub}>Register under an existing organisation. Approved by org admin.</Text>
              </View>
              <Text style={{ fontSize: 20, color: C.muted }}>›</Text>
            </TouchableOpacity>
          </View>
        </KeyboardScroll>
      </View>
    );
  }

  // ── ADMIN REGISTER ───────────────────────────────────────────────────────
  if (mode === "admin") {
    return (
      <View style={S.root}>
        <StatusBar backgroundColor={C.header} barStyle="light-content" translucent />
        <KeyboardScroll>
          <View style={[S.heroSmall, { paddingTop: TOP_PAD }]}>
            <TouchableOpacity onPress={() => setMode("choose")} style={S.backBtn}>
              <Text style={S.backArrow}>‹</Text>
              <Text style={S.backTxt}>Back</Text>
            </TouchableOpacity>
            <Text style={S.heroTitle}>Register Organisation</Text>
            <Text style={S.heroSub}>SuperAdmin will review and approve your request</Text>
          </View>
          <View style={S.card}>
            <SectionLabel text="ADMIN DETAILS" />
            <FieldLabel text="Full Name" required />
            <FieldInput value={adminName} onChange={setAdminName} placeholder="Your full name" />
            <FieldLabel text="Phone Number" required />
            <PhoneInput
              value={adminPhone}
              onChange={setAdminPhone}
              placeholder="10-digit mobile"
            />
            <FieldLabel text="Email" required />
            <FieldInput
              value={adminEmail}
              onChange={(value) => { setAdminEmail(value); setAdminOtpSent(false); setAdminOtpVerified(false); setAdminOtp(""); setAdminOtpCooldown(0); }}
              placeholder="admin@org.com"
              keyboard="email-address"
            />
            <FieldLabel text="Email OTP Verification" required />
            <OtpInlineBox
              otpValue={adminOtp}
              onOtpChange={setAdminOtp}
              otpSent={adminOtpSent}
              otpVerified={adminOtpVerified}
              otpLoading={adminOtpLoading}
              cooldown={adminOtpCooldown}
              onAction={() => handleOtpAction({
                emailValue: adminEmail,
                otpValue: adminOtp,
                otpSentValue: adminOtpSent,
                cooldownValue: adminOtpCooldown,
                setSent: setAdminOtpSent,
                setVerified: setAdminOtpVerified,
                setLoading: setAdminOtpLoading,
                setCooldown: setAdminOtpCooldown,
              })}
            />
            <FieldLabel text="Password" required />
            <PasswordInput value={adminPass} onChange={setAdminPass} placeholder="Set a password" />
            <FieldLabel text="Confirm Password" required />
            <PasswordInput value={adminConfirmPass} onChange={setAdminConfirmPass} placeholder="Re-enter password" />

            <SectionLabel text="ORGANISATION DETAILS" />
            <FieldLabel text="Organisation Name" required />
            <FieldInput value={orgName} onChange={setOrgName} placeholder="e.g. Delhi Public School" />

            <FieldLabel text="Organisation Type" required />
            <View style={S.pillRow}>
              {ORG_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => setOrgType(t)}
                  style={[S.typePill, orgType === t && { backgroundColor: C.primary, borderColor: C.primary }]}>
                  <Text style={{ color: orgType === t ? C.white : C.text, fontWeight: "700", fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel text="Address" />
            <FieldInput value={orgAddress} onChange={setOrgAddress} placeholder="Full address" />
            <FieldLabel text="Organisation Phone" />
            <PhoneInput value={orgPhone} onChange={setOrgPhone} placeholder="Office phone" />

            <Btn title="Submit for SuperAdmin Approval" onPress={submitAdmin} />
          </View>
        </KeyboardScroll>
      </View>
    );
  }

  // ── USER REGISTER ────────────────────────────────────────────────────────
  return (
    <View style={S.root}>
      <StatusBar backgroundColor={C.header} barStyle="light-content" translucent />
      <KeyboardScroll>
        <View style={[S.heroSmall, { paddingTop: TOP_PAD }]}>
          <TouchableOpacity onPress={() => setMode("choose")} style={S.backBtn}>
            <Text style={S.backArrow}>‹</Text>
            <Text style={S.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={S.heroTitle}>Create Account</Text>
          <Text style={S.heroSub}>Your org admin will approve your request</Text>
        </View>
        <View style={S.card}>
          <SectionLabel text="I AM A" />
          <View style={S.pillRow}>
            {USER_ROLES.map((r) => {
              const active = role === r.id;
              return (
                <TouchableOpacity key={r.id} onPress={() => setRole(r.id)}
                  style={[S.rolePill, { backgroundColor: active ? r.color : r.bg, borderColor: r.color }]}>
                  <Text style={{ fontSize: 16 }}>{r.icon}</Text>
                  <Text style={[S.rolePillText, { color: active ? C.white : r.color }]}>{r.short}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel text="Full Name" required />
          <FieldInput value={name} onChange={setName} placeholder="Your full name" />
          <FieldLabel text="Phone Number" required />
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="10-digit mobile"
          />
          <FieldLabel text="Email" required />
          <FieldInput
            value={email}
            onChange={(value) => { setEmail(value); setOtpSent(false); setOtpVerified(false); setOtp(""); setOtpCooldown(0); }}
            placeholder="you@email.com"
            keyboard="email-address"
          />
          <FieldLabel text="Email OTP Verification" required />
          <OtpInlineBox
            otpValue={otp}
            onOtpChange={setOtp}
            otpSent={otpSent}
            otpVerified={otpVerified}
            otpLoading={otpLoading}
            cooldown={otpCooldown}
            onAction={() => handleOtpAction({
              emailValue: email,
              otpValue: otp,
              otpSentValue: otpSent,
              cooldownValue: otpCooldown,
              setSent: setOtpSent,
              setVerified: setOtpVerified,
              setLoading: setOtpLoading,
              setCooldown: setOtpCooldown,
            })}
          />

          <View style={S.orgSearchHeader}>
            <FieldLabel text="Select Organisation" required />
            <TextInput
              style={S.orgSearchInput}
              value={orgSearch}
              onChangeText={setOrgSearch}
              placeholder="Search org"
              placeholderTextColor={C.mutedLight}
              autoCorrect={false}
            />
          </View>
          {orgs.length === 0 ? (
            <View style={S.emptyBox}><Text style={{ color: C.muted }}>No organisations available yet.</Text></View>
          ) : searchedOrgs.length === 0 ? (
            <View style={S.emptyBox}><Text style={{ color: C.muted }}>No matching organisation found.</Text></View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.sideScrollContent}
              style={S.sideScroll}
              keyboardShouldPersistTaps="handled"
            >
              {searchedOrgs.map((o) => {
                const active = orgId === o.id;
                return (
                  <TouchableOpacity key={o.id}
                    onPress={() => { setOrgId(o.id); setRouteId(""); setStop(""); }}
                    style={[S.orgPill, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
                    <Text style={{ color: active ? C.white : C.text, fontWeight: "900", fontSize: 12 }} numberOfLines={1}>{o.name}</Text>
                    <Text style={{ color: active ? C.muted : C.muted, fontSize: 10 }}>{o.type}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {orgId ? (
            <>
              <FieldLabel text="Select Route" required />
              {filteredRoutes.length === 0 ? (
                <View style={S.emptyBox}><Text style={{ color: C.muted }}>No routes set up yet. Contact admin.</Text></View>
              ) : (
                <View style={S.pillRow}>
                  {filteredRoutes.map((r) => {
                    const active = routeId === r.id;
                    return (
                      <TouchableOpacity key={r.id}
                        onPress={() => { setRouteId(r.id); setStop(""); }}
                        style={[S.routePill, active && { backgroundColor: C.primaryDark, borderColor: C.primaryDark }]}>
                        <Text style={{ color: active ? C.white : C.text, fontWeight: "900", fontSize: 12 }} numberOfLines={1}>{r.name}</Text>
                        <Text style={{ color: active ? C.muted : C.muted, fontSize: 10 }}>{r.busNo}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          {selectedRoute && role !== "driver" ? (
            <>
              <FieldLabel text="Your Pickup Point" required />
              <View style={S.pillRow}>
                {selectedRoute.stops.slice(0, -1).map((s) => (
                  <TouchableOpacity key={s} onPress={() => setStop(s)}
                    style={[S.stopPill, stop === s && { backgroundColor: C.primaryDark, borderColor: C.primaryDark }]}>
                    <Text style={{ color: stop === s ? C.white : C.text, fontSize: 12, fontWeight: "700" }}>📍 {s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          {(role === "school" || role === "college") && (
            <>
              <View style={S.childSectionHeader}>
                <SectionLabel text="CHILD DETAILS" />
                <TouchableOpacity onPress={addChild} style={S.addChildBtn}>
                  <Text style={S.addChildText}>＋ Add Child</Text>
                </TouchableOpacity>
              </View>

              {children.map((child, index) => (
                <View key={child.id} style={S.childBox}>
                  <View style={S.childHeader}>
                    <Text style={S.childTitle}>Child {index + 1}</Text>
                    {children.length > 1 ? (
                      <TouchableOpacity onPress={() => deleteChild(child.id)} style={S.deleteChildBtn}>
                        <Text style={S.deleteChildText}>Delete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <FieldLabel text="Child's Full Name" required={index === 0} />
                  <FieldInput value={child.name} onChange={(value) => updateChild(child.id, "name", value)} placeholder="Child's name" />
                  <FieldLabel text="Class / Course" />
                  <FieldInput value={child.className} onChange={(value) => updateChild(child.id, "className", value)} placeholder="e.g. 10th A  or  B.Tech CSE" />
                  <FieldLabel text="Roll / Admission No" />
                  <FieldInput value={child.rollNo} onChange={(value) => updateChild(child.id, "rollNo", value)} placeholder="Roll number" />
                </View>
              ))}
            </>
          )}
          {role === "employee" && (
            <>
              <SectionLabel text="WORK DETAILS" />
              <FieldLabel text="Department" />
              <FieldInput value={dept} onChange={setDept} placeholder="e.g. Engineering" />
              <FieldLabel text="Employee ID" />
              <FieldInput value={empId} onChange={setEmpId} placeholder="e.g. EMP-1042" />
              <FieldLabel text="Shift Start Time" />
              <FieldInput value={shift} onChange={setShift} placeholder="e.g. 9:00 AM" />
            </>
          )}
          {role === "driver" && (
            <>
              <SectionLabel text="DRIVER DETAILS" />
              <FieldLabel text="License Number" />
              <FieldInput value={license} onChange={setLicense} placeholder="e.g. KA-01-20180034" />
              <FieldLabel text="Experience" />
              <FieldInput value={exp} onChange={setExp} placeholder="e.g. 5 years" />
            </>
          )}

          <FieldLabel text="Password" required />
          <PasswordInput value={pass} onChange={setPass} placeholder="Choose a password" />
          <FieldLabel text="Confirm Password" required />
          <PasswordInput value={confirmPass} onChange={setConfirmPass} placeholder="Re-enter password" />
          <Btn title="Submit for Approval" onPress={submitUser} />
        </View>
      </KeyboardScroll>
    </View>
  );
}

const S = StyleSheet.create({
  // Root is white so the extra ScrollView bottom padding will not show blue color.
  root:         { flex: 1, backgroundColor: C.bg },
  heroSmall:    { backgroundColor: C.header, paddingHorizontal: 22, paddingBottom: 24 },
  heroTitle:    { fontSize: 30, fontWeight: "900", color: C.white, marginBottom: 4, marginTop: 8 },
  heroSub:      { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "600" },
  backBtn:      { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  backArrow:    { color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: "300", lineHeight: 28, marginRight: 2 },
  backTxt:      { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "700" },
  card:         { backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22 },
  label:        { color: C.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  sectionLabel: { color: C.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase",
                  marginTop: 20, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.accent, paddingLeft: 8 },
  input:        { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, marginBottom: 2 },
  passwordWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, marginBottom: 2 },
  passwordInput:{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  passwordToggle:{ paddingHorizontal: 14, paddingVertical: 12 },
  passwordToggleText:{ color: C.accent, fontSize: 12, fontWeight: "900" },
  pillRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  choiceCard:   { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 16,
                  borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  choiceIcon:   { fontSize: 36 },
  choiceTitle:  { fontSize: 15, fontWeight: "900", color: C.text, marginBottom: 4 },
  choiceSub:    { fontSize: 12, color: C.muted, fontWeight: "600", lineHeight: 17 },
  typePill:     { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 8, backgroundColor: C.card },
  rolePill:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 22, borderWidth: 1.5, gap: 6 },
  rolePillText: { fontSize: 12, fontWeight: "900" },
  orgPill:      { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10,
                  width: 160, backgroundColor: C.card },
  routePill:    { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10,
                  maxWidth: 160, backgroundColor: C.card },
  stopPill:     { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 8, backgroundColor: C.card },
  orgSearchHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 },
  orgSearchInput:{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                   paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text, marginTop: 6, maxWidth: 180 },
  sideScrollContent: { gap: 8, paddingRight: 14 },
  emptyBox:     { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 8, alignItems: "center" },
  childSectionHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  addChildBtn:  { backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  addChildText: { color: C.accent, fontSize: 11, fontWeight: "900" },
  childBox:     { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, marginBottom: 10 },
  childHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  childTitle:   { color: C.text, fontSize: 13, fontWeight: "900" },
  deleteChildBtn:{ backgroundColor: C.accentLight, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  deleteChildText:{ color: C.accent, fontSize: 11, fontWeight: "900" },
  otpBlock:    { marginBottom: 8 },
  otpInlineRow:{ flexDirection: "row", alignItems: "center", gap: 10 },
  otpInlineInput:{ flex: 1, marginBottom: 0, minHeight: 46 },
  otpDisabledInput:{ opacity: 0.75 },
  otpInlineBtn:{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                  minWidth: 116, alignItems: "center", justifyContent: "center" },
  otpInlineBtnText:{ color: C.white, fontSize: 12, fontWeight: "900" },
  otpHint:     { fontSize: 11, fontWeight: "700", marginTop: 6, lineHeight: 16 },
  otpRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8, gap: 10 },
  otpBtn:      { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  otpBtnText:  { color: C.white, fontSize: 12, fontWeight: "900" },
  otpStatus:   { fontSize: 12, fontWeight: "800", flex: 1, textAlign: "right" },
  otpVerifyRow:{ flexDirection: "row", alignItems: "center", gap: 10 },
  otpInput:    { flex: 1, marginBottom: 0 },
  verifyBtn:   { backgroundColor: C.primaryDark, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  verifyBtnText:{ color: C.white, fontSize: 12, fontWeight: "900" },
  disabledBtn: { opacity: 0.55 },
});
