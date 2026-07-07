package com.tracemybus.api.util;

public final class PhoneUtils {

    private PhoneUtils() {}

    public static String normalize(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("\\D", "").trim();
    }

    public static boolean isTenDigits(String phone) {
        return normalize(phone).matches("\\d{10}");
    }

    public static String requireTenDigits(String phone) {
        String clean = normalize(phone);
        if (!clean.matches("\\d{10}")) {
            throw new IllegalArgumentException("Please enter a valid 10-digit phone number.");
        }
        return clean;
    }

    public static String toE164India(String phone) {
        String clean = requireTenDigits(phone);
        return "+91" + clean;
    }

    public static String mask(String phone) {
        String clean = normalize(phone);
        if (clean.length() <= 4) return clean;
        return clean.substring(0, 2) + "******" + clean.substring(clean.length() - 2);
    }
}
