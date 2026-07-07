package com.tracemybus.api.util;

import java.util.concurrent.ThreadLocalRandom;

public final class IdGenerator {

    private IdGenerator() {}

    public static String makeId(String prefix) {
        return prefix + "_" + System.currentTimeMillis() + "_" +
                Long.toHexString(ThreadLocalRandom.current().nextLong()).substring(0, 8);
    }
}
