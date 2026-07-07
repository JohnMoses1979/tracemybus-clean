import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { pageStyles } from "../../constants/layout";
import { API_BASE_URL } from "../../services/api";

const CHAT_API_URL = `${API_BASE_URL}/chat`;

function buildSystemPrompt(currentUser, users, routes, trips, orgs, sosAlerts, approvals) {
  const role = currentUser?.role || "user";
  const org = orgs?.find((o) => o.id === currentUser?.orgId);

  const orgRoutes = routes?.filter((r) => {
    if (role === "superadmin") return true;
    return r.orgId === currentUser?.orgId;
  }) || [];

  const orgUsers = users?.filter((u) => {
    if (role === "superadmin") return true;
    return u.orgId === currentUser?.orgId && u.role !== "admin";
  }) || [];

  const liveTrips = orgRoutes
    .filter((r) => trips?.[r.id]?.status === "live")
    .map((r) => {
      const trip = trips[r.id];
      const driver = users?.find((u) => u.id === r.driverId);
      return `Route: ${r.name}, Bus: ${r.busNo}, Driver: ${driver?.name || "Unknown"}, Direction: ${trip.direction || "pickup"}, GPS: ${trip.gpsOn ? "ON" : "OFF"}`;
    });

  const pendingApprovals = approvals?.filter((a) => a.status === "pending") || [];
  const activeSos = sosAlerts?.filter((s) => String(s.status || "").toLowerCase() !== "resolved") || [];

  let context = `You are TraceMyBus AI Assistant — a smart, helpful assistant built into the TraceMyBus school/office bus tracking app.

Current User:
- Name: ${currentUser?.name || "Unknown"}
- Role: ${role}
- Phone: ${currentUser?.phone || "—"}
- Organisation: ${org?.name || currentUser?.org || "—"}

`;

  if (role === "superadmin") {
    context += `SuperAdmin Overview:
- Total Organisations: ${orgs?.length || 0}
- Total Users: ${orgUsers.length}
- Live Trips Right Now: ${liveTrips.length}
- Pending Org Approvals: ${pendingApprovals.filter((a) => a.type === "admin_request").length}
- Active SOS Alerts: ${activeSos.length}

Organisations:
${orgs?.map((o) => `  • ${o.name} (${o.type}) — Admin: ${users?.find((u) => u.id === o.adminId)?.name || "—"}`).join("\n") || "None"}
`;
  }

  if (role === "admin") {
    const drivers = orgUsers.filter((u) => u.role === "driver");
    const passengers = orgUsers.filter((u) => !["admin", "driver"].includes(u.role));
    context += `Admin Overview for ${org?.name || "your org"}:
- Routes: ${orgRoutes.length}
- Drivers: ${drivers.length}
- Passengers: ${passengers.length}
- Live Trips: ${liveTrips.length}
- Pending User Approvals: ${pendingApprovals.filter((a) => a.type === "user_request").length}
- Active SOS Alerts: ${activeSos.length}

Routes:
${orgRoutes.map((r) => {
  const driver = users?.find((u) => u.id === r.driverId);
  const trip = trips?.[r.id];
  return `  • ${r.name} (Bus: ${r.busNo}) — Driver: ${driver?.name || "Not assigned"} — Status: ${trip?.status || "idle"}`;
}).join("\n") || "None"}

${liveTrips.length > 0 ? `Live Trips:
${liveTrips.map((t) => `  • ${t}`).join("\n")}` : "No live trips right now."}
${activeSos.length > 0 ? `
Active SOS Alerts:
${activeSos.map((s) => {
  const sender = users?.find((u) => u.id === s.userId || u.id === s.senderId);
  const route = routes?.find((r) => r.id === s.routeId);
  return `  • From: ${sender?.name || "Unknown"} on Route: ${route?.name || "—"}`;
}).join("\n")}` : ""}
`;
  }

  if (role === "driver") {
    const driverRoute = routes?.find((r) => r.driverId === currentUser?.id);
    const trip = driverRoute ? trips?.[driverRoute.id] : null;
    const passengers = users?.filter((u) => u.routeId === driverRoute?.id) || [];
    context += `Driver Info:
- Assigned Route: ${driverRoute?.name || "Not assigned"}
- Bus Number: ${driverRoute?.busNo || "—"}
- Trip Status: ${trip?.status || "idle"}
- Direction: ${trip?.direction || "—"}
- GPS: ${trip?.gpsOn ? "ON" : "OFF"}
- Passengers on Route: ${passengers.length}
- Current Stop: ${driverRoute?.stops?.[trip?.currentStopIndex || 0] || "—"}
${activeSos.filter((s) => s.routeId === driverRoute?.id).length > 0 ? `- Active SOS on your route: ${activeSos.filter((s) => s.routeId === driverRoute?.id).length}` : ""}
`;
  }

  if (["school", "college", "employee"].includes(role)) {
    const userRoute = routes?.find((r) => r.id === currentUser?.routeId);
    const driver = users?.find((u) => u.id === userRoute?.driverId);
    const trip = userRoute ? trips?.[userRoute.id] : null;
    context += `Passenger Info:
- Assigned Route: ${userRoute?.name || "Not assigned"}
- Bus Number: ${userRoute?.busNo || "—"}
- Pickup Stop: ${currentUser?.stop || "—"}
- Trip Status: ${trip?.status || "idle"}
- Driver: ${driver?.name || "Not assigned"} (${driver?.phone || "—"})
- GPS Active: ${trip?.gpsOn ? "Yes" : "No"}
- Current Bus Stop: ${userRoute?.stops?.[trip?.currentStopIndex || 0] || "—"}
- ETA: ${trip?.eta || "—"} min
`;
  }

  context += `
You can help the user with:
- Questions about routes, trips, bus status, GPS tracking
- Information about users, drivers, passengers
- SOS alerts and emergency situations
- App navigation guidance
- Organisation/admin management questions
- General bus tracking queries

Keep responses concise, friendly and helpful. Use emojis where appropriate.
If asked about something you don't have data for, say so honestly.
Always respond in the same language the user is writing in.`;

  return context;
}

const QUICK_QUESTIONS = {
  superadmin: ["How many orgs are active?", "Any pending approvals?", "Show active SOS", "Total users?"],
  admin: ["How many live trips?", "Show pending approvals", "Any active SOS?", "List my routes"],
  driver: ["What's my route today?", "How many passengers?", "Is GPS active?", "Any SOS alerts?"],
  school: ["Where is my bus?", "What's the ETA?", "Who is my driver?", "What's my pickup stop?"],
  college: ["Where is my bus?", "What's the ETA?", "Who is my driver?", "What's my pickup stop?"],
  employee: ["Where is my bus?", "What's the ETA?", "Who is my driver?", "What's my shift time?"],
};

const QUICK_ICONS = ["bus-outline", "time-outline", "person-outline", "help-circle-outline"];

function AssistantAvatar({ small = false }) {
  return (
    <LinearGradient
      colors={["#3BD58F", "#2EB872", "#1C8E58"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.aiAvatar, small && styles.aiAvatarSmall]}
    >
      <MaterialCommunityIcons
        name="robot-excited-outline"
        size={small ? 16 : 22}
        color={C.white}
      />
    </LinearGradient>
  );
}

export default function ChatBotScreen() {
  const { currentUser, users, routes, trips, orgs, sosAlerts, approvals } = useApp();
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: `Hi ${currentUser?.name?.split(" ")[0] || "there"}! 👋 I'm your TraceMyBus AI Assistant. I can help you with routes, trips, bus tracking, users and more!

What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", text: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(
        currentUser,
        users,
        routes,
        trips,
        orgs,
        sosAlerts,
        approvals
      );

      const chatHistory = newMessages.slice(1, -1).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          systemPrompt,
          history: chatHistory,
        }),
      });

      const data = await response.json();
      const reply = data?.reply || data?.msg || "Sorry, I couldn't get a response. Please try again.";

      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "⚠️ Connection error. Please check your internet and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        text: `Hi ${currentUser?.name?.split(" ")[0] || "there"}! 👋 Chat cleared. How can I help you?`,
      },
    ]);
  };

  const suggestions = QUICK_QUESTIONS[currentUser?.role] || QUICK_QUESTIONS.school;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={pageStyles.blueTop}>
        <LinearGradient
          colors={["rgba(46,184,114,0.28)", "rgba(46,184,114,0.10)", "rgba(255,255,255,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <AssistantAvatar />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>TraceMyBus AI</Text>
                <Text style={styles.headerSub}>Smart help for routes, trips, SOS and live tracking</Text>
              </View>
            </View>
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Ionicons name="refresh-outline" size={15} color={C.white} />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.statusPill}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>AI Online</Text>
            </View>
            <View style={styles.statusPillMuted}>
              <Ionicons name="sparkles-outline" size={14} color={C.primary} />
              <Text style={styles.statusMutedText}>Powered by GroqCloud</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 1 && !loading && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeIconWrap}>
                <Ionicons name="flash-outline" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTitle}>Quick help, right inside the app</Text>
                <Text style={styles.welcomeSub}>Ask about bus location, ETA, routes, driver details, approvals or SOS status.</Text>
              </View>
            </View>
          </View>
        )}

        {messages.map((msg, index) => (
          <View
            key={index}
            style={[styles.bubbleWrap, msg.role === "user" ? styles.userWrap : styles.aiWrap]}
          >
            {msg.role !== "user" && <AssistantAvatar small />}

            <View style={[styles.bubbleCard, msg.role === "user" ? styles.userBubbleCard : styles.aiBubbleCard]}>
              {msg.role === "user" ? (
                <View style={styles.userMetaRow}>
                  <Text style={styles.userTag}>You</Text>
                  <Ionicons name="send" size={12} color={C.white} />
                </View>
              ) : (
                <View style={styles.aiMetaRow}>
                  <Text style={styles.aiTag}>TraceMyBus AI</Text>
                  <View style={styles.aiTagBadge}>
                    <Text style={styles.aiTagBadgeText}>Smart</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.bubbleText, msg.role === "user" && styles.userBubbleText]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubbleWrap, styles.aiWrap]}>
            <AssistantAvatar small />
            <View style={[styles.bubbleCard, styles.aiBubbleCard]}>
              <View style={styles.aiMetaRow}>
                <Text style={styles.aiTag}>TraceMyBus AI</Text>
                <View style={styles.typingPill}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              </View>
              <Text style={styles.thinkingHint}>Generating the best answer for you…</Text>
            </View>
          </View>
        )}

        {messages.length === 1 && !loading && (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.suggestLabel}>Quick questions</Text>
            <View style={styles.suggestGrid}>
              {suggestions.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestBtn}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.88}
                >
                  <View style={styles.suggestIconWrap}>
                    <Ionicons name={QUICK_ICONS[i % QUICK_ICONS.length]} size={16} color={C.primary} />
                  </View>
                  <Text style={styles.suggestText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputShell}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.muted} />
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about routes, ETA, tracking, SOS..."
              placeholderTextColor={C.muted}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={(!input.trim() || loading) ? [C.surface, C.surface] : ["#35CA82", "#179860"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendGradient}
            >
              <Ionicons name="arrow-up" size={20} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginTop: 46,
    marginBottom: 10,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(23,46,64,0.95)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
  },
  headerSub: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    lineHeight: 17,
  },
  heroStatsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46,184,114,0.16)",
    borderColor: "rgba(46,184,114,0.32)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPillMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  statusText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },
  statusMutedText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  clearBtnText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "800",
  },
  welcomeCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  welcomeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primaryLight,
  },
  welcomeTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  welcomeSub: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  bubbleWrap: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
    gap: 8,
  },
  aiWrap: {
    justifyContent: "flex-start",
  },
  userWrap: {
    justifyContent: "flex-end",
  },
  aiAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  aiAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bubbleCard: {
    maxWidth: "82%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  aiBubbleCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderBottomLeftRadius: 8,
  },
  userBubbleCard: {
    backgroundColor: C.primary,
    borderColor: "rgba(255,255,255,0.06)",
    borderBottomRightRadius: 8,
  },
  aiMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 7,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  aiTag: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  aiTagBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiTagBadgeText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  userTag: {
    color: C.white,
    fontSize: 12,
    fontWeight: "900",
  },
  bubbleText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  userBubbleText: {
    color: C.white,
  },
  typingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typingText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  thinkingHint: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  suggestLabel: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  suggestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  suggestBtn: {
    width: "48%",
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 76,
    justifyContent: "space-between",
  },
  suggestIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  suggestText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  inputShell: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: C.nav,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
