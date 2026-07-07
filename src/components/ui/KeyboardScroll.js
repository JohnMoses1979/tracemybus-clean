/**
 * KeyboardScroll
 * ─────────────
 * Drop-in replacement for ScrollView on any screen that has TextInputs.
 * Handles:
 *  - KeyboardAvoidingView (iOS padding / Android height)
 *  - keyboardShouldPersistTaps="handled" so taps inside the scroll don't dismiss keyboard
 *  - contentContainerStyle paddingBottom so the last input is never hidden under the keyboard
 */
import React from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";

export function KeyboardScroll({ children, style, contentStyle }) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { paddingBottom: 60 },
});
