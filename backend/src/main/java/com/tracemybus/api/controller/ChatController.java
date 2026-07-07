package com.tracemybus.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai.groq.api-key:${GROQ_API_KEY:}}")
    private String groqApiKey;

    @Value("${app.ai.groq.model:${GROQ_MODEL:llama-3.1-8b-instant}}")
    private String groqModel;

    @Value("${app.ai.groq.chat-url:${GROQ_CHAT_URL:https://api.groq.com/openai/v1/chat/completions}}")
    private String groqChatUrl;


    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        boolean configured = groqApiKey != null && !groqApiKey.trim().isEmpty();
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "provider", "GroqCloud",
                "configured", configured,
                "model", normalizeModel(groqModel)
        ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> body) {
        try {
            if (groqApiKey == null || groqApiKey.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "ok", false,
                        "reply", "AI is not configured. Add GROQ_API_KEY in backend environment, then restart backend."
                ));
            }

            String message = String.valueOf(body.getOrDefault("message", "")).trim();
            String systemPrompt = String.valueOf(body.getOrDefault(
                    "systemPrompt",
                    "You are a helpful GroqCloud assistant for the TraceMyBus bus tracking app."
            )).trim();

            if (message.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "ok", false,
                        "reply", "Message is required."
                ));
            }

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.addAll(normalizeHistory(body.get("history")));
            messages.add(Map.of("role", "user", "content", message));

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", normalizeModel(groqModel));
            requestBody.put("messages", messages);
            requestBody.put("stream", false);
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 600);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey.trim());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    normalizeChatUrl(groqChatUrl),
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            String reply = extractReply(response.getBody());
            if (reply == null || reply.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "ok", false,
                        "reply", "GroqCloud did not return a response. Please try again."
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "ok", true,
                    "provider", "GroqCloud",
                    "model", normalizeModel(groqModel),
                    "reply", reply.trim()
            ));
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.ok(Map.of(
                    "ok", false,
                    "reply", "GroqCloud API error: " + e.getStatusCode() + ". Check GROQ_API_KEY, credits, and model name.",
                    "details", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "ok", false,
                    "reply", "AI service error: " + e.getMessage()
            ));
        }
    }

    private String normalizeModel(String model) {
        if (model == null || model.trim().isEmpty()) {
            return "llama-3.1-8b-instant";
        }
        return model.trim();
    }

    private String normalizeChatUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return "https://api.groq.com/openai/v1/chat/completions";
        }
        return url.trim();
    }

    private List<Map<String, Object>> normalizeHistory(Object rawHistory) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        if (!(rawHistory instanceof List<?> history)) {
            return normalized;
        }

        for (Object item : history) {
            if (!(item instanceof Map<?, ?> rawMap)) {
                continue;
            }

            Object rawRole = rawMap.get("role");
            String role = rawRole == null ? "user" : String.valueOf(rawRole).trim().toLowerCase();
            if (role.equals("model") || role.equals("bot") || role.equals("ai")) {
                role = "assistant";
            }
            if (!role.equals("user") && !role.equals("assistant")) {
                continue;
            }

            String content = extractContent(rawMap);
            if (content == null || content.trim().isEmpty()) {
                continue;
            }

            normalized.add(Map.of("role", role, "content", content.trim()));
        }
        return normalized;
    }

    private String extractContent(Map<?, ?> rawMap) {
        Object content = rawMap.get("content");
        if (content instanceof String text) {
            return text;
        }

        Object text = rawMap.get("text");
        if (text instanceof String textValue) {
            return textValue;
        }

        // Backward compatibility for old Gemini-style frontend payload:
        // { role: "model", parts: [{ text: "..." }] }
        Object parts = rawMap.get("parts");
        if (parts instanceof List<?> partList && !partList.isEmpty()) {
            StringBuilder builder = new StringBuilder();
            for (Object part : partList) {
                if (part instanceof Map<?, ?> partMap) {
                    Object partText = partMap.get("text");
                    if (partText instanceof String partTextValue && !partTextValue.trim().isEmpty()) {
                        if (builder.length() > 0) {
                            builder.append("\n");
                        }
                        builder.append(partTextValue.trim());
                    }
                }
            }
            return builder.toString();
        }

        return null;
    }

    private String extractReply(Map<?, ?> responseBody) {
        if (responseBody == null) {
            return null;
        }

        Object choicesObj = responseBody.get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
            return null;
        }

        Object firstChoice = choices.get(0);
        if (!(firstChoice instanceof Map<?, ?> choiceMap)) {
            return null;
        }

        Object messageObj = choiceMap.get("message");
        if (!(messageObj instanceof Map<?, ?> messageMap)) {
            return null;
        }

        Object contentObj = messageMap.get("content");
        if (contentObj instanceof String content) {
            return content;
        }

        if (contentObj instanceof List<?> contentList) {
            StringBuilder builder = new StringBuilder();
            for (Object item : contentList) {
                if (item instanceof Map<?, ?> contentMap) {
                    Object text = contentMap.get("text");
                    if (text instanceof String textValue && !textValue.trim().isEmpty()) {
                        if (builder.length() > 0) {
                            builder.append("\n");
                        }
                        builder.append(textValue.trim());
                    }
                }
            }
            return builder.toString();
        }

        return null;
    }
}
