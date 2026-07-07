import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, StatusBar, Image,
} from "react-native";
import { C } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { Btn, OutlineBtn } from "../../components/ui/index";
import { KeyboardScroll } from "../../components/ui/KeyboardScroll";
import { appAlert } from "../../utils/alerts";
import { api } from "../../services/api";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight || 30) : 44;

const SUPERADMIN_CREDENTIALS = {
  phone: "9988776655",
  password: "123456",
};

function cleanPhone(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 10);
}

function isTenDigitPhone(value = "") {
  return cleanPhone(value).length === 10;
}

function PasswordInput({ value, onChangeText, placeholder, visible, onToggle }) {
  return (
    <View style={S.passwordWrap}>
      <TextInput
        style={S.passwordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.mutedLight}
        secureTextEntry={!visible}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <TouchableOpacity style={S.passwordToggle} onPress={onToggle}>
        <Text style={S.passwordToggleText}>{visible ? "Hide" : "View"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ForgotOtpRow({ otp, setOtp, sent, verified, loading, cooldown, onAction }) {
  const typed = String(otp || "").trim();
  const buttonText = loading
    ? "Please wait..."
    : verified
      ? "Verified ✅"
      : !sent
        ? "Send OTP"
        : typed.length > 0
          ? "Verify OTP"
          : cooldown > 0
            ? "Verify OTP"
            : "Resend OTP";

  return (
    <View style={S.otpBlock}>
      <View style={S.otpInlineRow}>
        <TextInput
          style={[S.input, S.otpInput, (!sent || verified) && S.otpDisabledInput]}
          value={otp}
          onChangeText={setOtp}
          placeholder={sent ? "Enter OTP" : "OTP"}
          placeholderTextColor={C.mutedLight}
          keyboardType="number-pad"
          maxLength={6}
          editable={sent && !verified}
        />
        <TouchableOpacity
          style={[S.otpBtn, (loading || verified) && S.disabledBtn]}
          disabled={loading || verified}
          onPress={onAction}
        >
          <Text style={S.otpBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[S.otpHint, { color: verified ? C.primary : C.muted }]}> 
        {verified
          ? "OTP verified. Set your new password."
          : sent
            ? cooldown > 0
              ? `OTP sent to registered email. Resend available in ${cooldown}s.`
              : "Didn’t get OTP? Tap Resend OTP."
            : "Send OTP to your registered email address."}
      </Text>
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const { login } = useApp();
  const [phone, setPhone] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [fpPhone, setFpPhone] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpOtpSent, setFpOtpSent] = useState(false);
  const [fpOtpVerified, setFpOtpVerified] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpCooldown, setFpCooldown] = useState(0);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (fpCooldown <= 0) return undefined;
    const timer = setInterval(() => setFpCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [fpCooldown]);

  const resetForgotState = () => {
    setForgotMode(false);
    setFpPhone("");
    setFpOtp("");
    setFpOtpSent(false);
    setFpOtpVerified(false);
    setFpLoading(false);
    setFpCooldown(0);
    setNewPass("");
    setConfirmPass("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const runLogin = async (loginPhone, loginPassword) => {
    setLoading(true);
    const result = await login(loginPhone, loginPassword);
    setLoading(false);

    if (!result.ok) {
      if (result.pending) {
        navigation.navigate("WaitingApproval", {
          phone: result.phone || loginPhone,
          name: result.request?.name || "User",
          role: result.request?.role || "user",
          approvalType: result.request?.type === "admin_request" ? "Organisation Admin" : result.request?.orgName || "Organisation",
        });
        return;
      }
      const msg = result.msg || "User not registered. Please register first.";
      setErr(msg);
      appAlert(result.rejected ? "Request Rejected" : "Login Failed", msg);
    }
  };

  const handleLogin = async () => {
    setErr("");
    const cleanedPhone = cleanPhone(phone);
    if (!cleanedPhone || !pass.trim()) {
      const msg = "Please enter registered phone number and password.";
      setErr(msg);
      appAlert("Missing Fields", msg);
      return;
    }
    if (!isTenDigitPhone(cleanedPhone)) {
      const msg = "Please enter a valid 10-digit phone number.";
      setErr(msg);
      appAlert("Invalid Phone", msg);
      return;
    }

    await runLogin(cleanedPhone, pass);
  };

  const handleSuperAdminQuickLogin = async () => {
    if (loading) return;
    setErr("");
    setPhone(SUPERADMIN_CREDENTIALS.phone);
    setPass(SUPERADMIN_CREDENTIALS.password);
    await runLogin(SUPERADMIN_CREDENTIALS.phone, SUPERADMIN_CREDENTIALS.password);
  };

  const sendForgotOtp = async () => {
    const mobile = cleanPhone(fpPhone);
    if (!isTenDigitPhone(mobile)) {
      appAlert("Invalid Phone", "Please enter your registered 10-digit mobile number.");
      return;
    }

    try {
      setFpLoading(true);
      await api.sendForgotPasswordOtp(mobile);
      setFpOtpSent(true);
      setFpOtpVerified(false);
      setFpOtp("");
      setFpCooldown(30);
      appAlert("OTP Sent", "OTP sent to your registered email address.");
    } catch (error) {
      appAlert("OTP Failed", error?.message || "Unable to send OTP to registered email.");
    } finally {
      setFpLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    const mobile = cleanPhone(fpPhone);
    const code = String(fpOtp || "").trim();
    if (!isTenDigitPhone(mobile) || !code) {
      appAlert("OTP Required", "Please enter phone number and OTP.");
      return;
    }

    try {
      setFpLoading(true);
      await api.verifyForgotPasswordOtp(mobile, code);
      setFpOtpVerified(true);
      appAlert("Verified ✅", "Email OTP verified. Now set your new password.");
    } catch (error) {
      setFpOtpVerified(false);
      appAlert("OTP Failed", error?.message || "Invalid OTP.");
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotOtpAction = async () => {
    if (!fpOtpSent) {
      await sendForgotOtp();
      return;
    }
    if (String(fpOtp || "").trim().length > 0) {
      await verifyForgotOtp();
      return;
    }
    if (fpCooldown <= 0) {
      await sendForgotOtp();
      return;
    }
    appAlert("OTP Required", "Please enter the OTP sent to your registered email address.");
  };

  const resetPassword = async () => {
    const mobile = cleanPhone(fpPhone);
    if (!fpOtpVerified) {
      appAlert("OTP Required", "Please verify OTP before setting a new password.");
      return;
    }
    if (newPass.length < 4) {
      appAlert("Weak Password", "New password must be at least 4 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      appAlert("Password Mismatch", "New password and confirm password must be same.");
      return;
    }

    try {
      setFpLoading(true);
      await api.resetForgotPassword(mobile, newPass);
      appAlert("Success ✅", "Password reset successfully. Please login with your new password.");
      setPhone(mobile);
      setPass("");
      resetForgotState();
    } catch (error) {
      appAlert("Reset Failed", error?.message || "Could not reset password.");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <View style={S.root}>
      <StatusBar backgroundColor={C.header} barStyle="light-content" translucent />
      <KeyboardScroll>
        <View style={[S.hero, { paddingTop: STATUS_H + 28 }]}>
          <View style={S.logoCard}>
            <Image
              source={require("../../../assets/icon.png")}
              style={S.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {!forgotMode ? (
          <View style={S.card}>
            <Text style={S.cardTitle}>Welcome Back</Text>
            <Text style={S.cardSub}>Sign in to your account</Text>

            <Text style={S.label}>Phone Number</Text>
            <TextInput
              style={S.input}
              value={phone}
              onChangeText={(value) => setPhone(cleanPhone(value))}
              placeholder="Enter registered phone"
              placeholderTextColor={C.mutedLight}
              keyboardType="phone-pad"
              maxLength={10}
              autoCorrect={false}
              autoCapitalize="none"
            />

            <Text style={S.label}>Password</Text>
            <PasswordInput
              value={pass}
              onChangeText={setPass}
              placeholder="Enter password"
              visible={showLoginPassword}
              onToggle={() => setShowLoginPassword((prev) => !prev)}
            />

            <TouchableOpacity style={S.forgotLink} onPress={() => setForgotMode(true)}>
              <Text style={S.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {err ? <View style={S.errBox}><Text style={S.errText}>{err}</Text></View> : null}

            <Btn title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />

            <TouchableOpacity
              style={[S.quickLoginBtn, loading && S.disabledBtn]}
              onPress={handleSuperAdminQuickLogin}
              disabled={loading}
              activeOpacity={0.84}
            >
              <Text style={S.quickLoginTitle}>Tap to fill SuperAdmin & Login</Text>
            </TouchableOpacity>

            <OutlineBtn title="New User? Register Here" onPress={() => navigation.navigate("Register")} />
          </View>
        ) : (
          <View style={S.card}>
            <Text style={S.cardTitle}>Forgot Password</Text>
            <Text style={S.cardSub}>Enter your registered mobile number. OTP will be sent to your registered email.</Text>

            <Text style={S.label}>Registered Phone Number</Text>
            <TextInput
              style={S.input}
              value={fpPhone}
              onChangeText={(value) => {
                setFpPhone(cleanPhone(value));
                setFpOtpSent(false);
                setFpOtpVerified(false);
                setFpOtp("");
                setFpCooldown(0);
              }}
              placeholder="Enter registered phone"
              placeholderTextColor={C.mutedLight}
              keyboardType="phone-pad"
              maxLength={10}
              autoCorrect={false}
              autoCapitalize="none"
              editable={!fpOtpVerified}
            />

            <Text style={S.label}>Email OTP Verification</Text>
            <ForgotOtpRow
              otp={fpOtp}
              setOtp={setFpOtp}
              sent={fpOtpSent}
              verified={fpOtpVerified}
              loading={fpLoading}
              cooldown={fpCooldown}
              onAction={handleForgotOtpAction}
            />

            {fpOtpVerified ? (
              <>
                <Text style={S.label}>New Password</Text>
                <PasswordInput
                  value={newPass}
                  onChangeText={setNewPass}
                  placeholder="Enter new password"
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((prev) => !prev)}
                />

                <Text style={S.label}>Confirm Password</Text>
                <PasswordInput
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  placeholder="Re-enter new password"
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((prev) => !prev)}
                />

                <Btn title={fpLoading ? "Saving..." : "Set New Password"} onPress={resetPassword} disabled={fpLoading} />
              </>
            ) : null}

            <OutlineBtn title="Back to Login" onPress={resetForgotState} />
          </View>
        )}
      </KeyboardScroll>
    </View>
  );
}

const S = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  hero:         { backgroundColor: C.bg, paddingHorizontal: 26, paddingBottom: 24, alignItems: "center" },
  logoCard:     { backgroundColor: "#FFFFFF", borderRadius: 32, width: 260, height: 260, alignItems: "center", justifyContent: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
  logoImage:    { width: 240, height: 240 },
  card:         { backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22 },
  cardTitle:    { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 2 },
  cardSub:      { fontSize: 13, color: C.muted, fontWeight: "600", marginBottom: 14 },
  label:        { color: C.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: 14, marginBottom: 6 },
  input:        { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  passwordWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  passwordInput:{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text },
  passwordToggle:{ paddingHorizontal: 14, paddingVertical: 12 },
  passwordToggleText:{ color: C.accent, fontSize: 12, fontWeight: "900" },
  forgotLink:   { alignSelf: "flex-end", marginTop: 8, marginBottom: 8 },
  forgotText:   { color: C.accent, fontSize: 13, fontWeight: "900" },
  quickLoginBtn:{ backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.primary, borderRadius: 14,
                  paddingVertical: 11, paddingHorizontal: 14, alignItems: "center", marginVertical: 4 },
  quickLoginTitle:{ color: C.primary, fontSize: 13, fontWeight: "900" },
  quickLoginSub:{ color: C.muted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  errBox:       { backgroundColor: C.dangerLight, borderRadius: 10, padding: 10, marginTop: 8 },
  errText:      { color: C.dangerDark, fontSize: 13, fontWeight: "700" },
  otpBlock:     { marginBottom: 8 },
  otpInlineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  otpInput:     { flex: 1, marginBottom: 0, minHeight: 46 },
  otpDisabledInput:{ opacity: 0.75 },
  otpBtn:       { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                  minWidth: 116, alignItems: "center", justifyContent: "center" },
  otpBtnText:   { color: C.white, fontSize: 12, fontWeight: "900" },
  otpHint:      { fontSize: 11, fontWeight: "700", marginTop: 6, lineHeight: 16 },
  disabledBtn:  { opacity: 0.55 },
});
