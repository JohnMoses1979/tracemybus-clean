package com.tracemybus.api.util;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class DateTimeUtils {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d/M/yyyy", new Locale("en", "IN"));
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a", new Locale("en", "IN"));

    private DateTimeUtils() {}

    public static String dateNow() {
        return LocalDate.now().format(DATE_FMT);
    }

    public static String timeNow() {
        return LocalTime.now().format(TIME_FMT);
    }

    public static String initials(String name) {
        if (name == null || name.isBlank()) return "U";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(2, parts.length); i++) {
            if (!parts[i].isEmpty()) sb.append(Character.toUpperCase(parts[i].charAt(0)));
        }
        return sb.isEmpty() ? "U" : sb.toString();
    }

    public static String displayName(String childName, String name) {
        if (childName != null && !childName.isBlank()) return childName;
        if (name != null && !name.isBlank()) return name;
        return "Passenger";
    }
}
