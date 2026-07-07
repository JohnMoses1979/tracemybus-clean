package com.tracemybus.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracemybus.api.entity.Notification;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.repository.NotificationRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.util.DateTimeUtils;
import com.tracemybus.api.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public Notification createNotification(String userId, String icon, String title, String body, Map<String, Object> extra) {
        if (userId == null || userId.isBlank()) return null;

        User receiver = userRepository.findById(userId).orElse(null);
        if (receiver == null || Boolean.FALSE.equals(receiver.getActive()) || Boolean.FALSE.equals(receiver.getNotificationEnabled())) {
            return null;
        }

        String extraJson;
        try {
            extraJson = objectMapper.writeValueAsString(extra != null ? extra : Map.of());
        } catch (Exception e) {
            extraJson = "{}";
        }

        Notification notification = Notification.builder()
                .id(IdGenerator.makeId("n"))
                .userId(userId)
                .icon(icon)
                .title(title)
                .body(body)
                .time(DateTimeUtils.timeNow())
                .date(DateTimeUtils.dateNow())
                .read(false)
                .type(extra != null ? String.valueOf(extra.getOrDefault("type", "")) : "")
                .sender(extra != null ? String.valueOf(extra.getOrDefault("sender", "")) : "")
                .senderRole(extra != null ? String.valueOf(extra.getOrDefault("senderRole", "")) : "")
                .audience(extra != null ? String.valueOf(extra.getOrDefault("audience", "")) : "")
                .audienceDetails(extra != null ? String.valueOf(extra.getOrDefault("audienceDetails", "")) : "")
                .deliveredAt(extra != null ? String.valueOf(extra.getOrDefault("deliveredAt", "")) : "")
                .extra(extraJson)
                .build();

        notification = notificationRepo.save(notification);
        sendExpoPush(receiver, title, body, extra, notification.getId());
        return notification;
    }

    public void notifyMany(List<String> userIds, String icon, String title, String body, Map<String, Object> extra) {
        Set<String> unique = new LinkedHashSet<>(userIds);
        unique.remove(null);
        unique.remove("");
        for (String id : unique) {
            createNotification(id, icon, title, body, extra);
        }
    }

    public void notifyMany(List<String> userIds, String icon, String title, String body) {
        notifyMany(userIds, icon, title, body, Map.of());
    }

    @Async
    public void sendExpoPush(User receiver, String title, String body, Map<String, Object> extra, String notificationId) {
        try {
            String token = receiver.getExpoPushToken();
            if (token == null || token.isBlank() || !token.startsWith("ExponentPushToken")) return;

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("to", token);
            payload.put("sound", "default");
            payload.put("priority", "high");
            payload.put("channelId", "bus-alerts");
            payload.put("title", title != null ? title : "TraceMyBus");
            payload.put("body", body != null ? body : "New alert");

            Map<String, Object> data = new LinkedHashMap<>(extra != null ? extra : Map.of());
            data.put("notificationId", notificationId);
            data.putIfAbsent("type", "notification");
            data.putIfAbsent("title", title != null ? title : "TraceMyBus");
            data.putIfAbsent("body", body != null ? body : "New alert");
            payload.put("data", data);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);
            restTemplate.postForEntity("https://exp.host/--/api/v2/push/send", request, String.class);
        } catch (Exception e) {
            log.warn("⚠️ Push notification failed: {}", e.getMessage());
        }
    }
}
