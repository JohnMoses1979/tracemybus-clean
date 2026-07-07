package com.tracemybus.api.service;

import com.tracemybus.api.entity.*;
import com.tracemybus.api.enums.*;
import com.tracemybus.api.repository.*;
import com.tracemybus.api.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SosService {

    private final SosAlertRepository sosAlertRepository;
    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final TripService tripService;

    @Transactional
    public Map<String, Object> passengerSos(String routeId, User currentUser) {
        Route route = routeRepository.findById(routeId).orElseThrow(() -> new NoSuchElementException("Route not found."));
        String message = currentUser.getName() + " reported emergency on " + route.getName() + ".";

        SosAlert sos = SosAlert.builder().id(IdGenerator.makeId("sos")).userId(currentUser.getId())
                .routeId(routeId).type(SosType.passenger).message(message).build();
        sos = sosAlertRepository.save(sos);

        List<String> driverIds = tripService.getDriverIdsForRoute(route);
        List<String> adminIds = tripService.getAdminIdsForOrg(route.getOrgId());
        List<String> notifyIds = new ArrayList<>(driverIds); notifyIds.addAll(adminIds);

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("type", "sos"); extra.put("sosId", sos.getId()); extra.put("sosType", "passenger");
        extra.put("routeId", routeId); extra.put("routeName", route.getName()); extra.put("status", "open");
        extra.put("sender", currentUser.getName()); extra.put("senderRole", currentUser.getRole().name());
        notificationService.notifyMany(notifyIds, "\uD83D\uDEA8", "Passenger SOS", message, extra);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true); result.put("sos", sos); result.put("msg", "Passenger SOS sent successfully to driver/admin.");
        result.put("deliveredTo", Map.of("drivers", driverIds.size(), "admins", adminIds.size()));
        return result;
    }

    public List<Map<String, Object>> getSosAlerts(User currentUser) {
        List<SosAlert> all = sosAlertRepository.findAllByOrderByCreatedAtDesc();
        Map<String, Route> routeMap = new HashMap<>();
        routeRepository.findAll().forEach(r -> routeMap.put(r.getId(), r));
        Map<String, User> userMap = new HashMap<>();
        userRepository.findAll().forEach(u -> userMap.put(u.getId(), u));

        List<Map<String, Object>> visible = new ArrayList<>();
        for (SosAlert sos : all) {
            Route route = routeMap.get(sos.getRouteId());
            boolean show = currentUser.getRole() == UserRole.superadmin
                    || (currentUser.getRole() == UserRole.admin && route != null && route.getOrgId() != null && route.getOrgId().equals(currentUser.getOrgId()))
                    || (currentUser.getRole() == UserRole.driver && route != null && (currentUser.getId().equals(route.getDriverId()) || (currentUser.getRouteId() != null && currentUser.getRouteId().equals(route.getId()))))
                    || currentUser.getId().equals(sos.getUserId());

            if (show) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", sos.getId()); item.put("userId", sos.getUserId()); item.put("routeId", sos.getRouteId());
                item.put("type", sos.getType() != null ? sos.getType().name() : null);
                item.put("message", sos.getMessage()); item.put("status", sos.getStatus() != null ? sos.getStatus().name() : null);
                item.put("response", sos.getResponse()); item.put("responderId", sos.getResponderId());
                item.put("responderName", sos.getResponderName()); item.put("responderRole", sos.getResponderRole());
                item.put("respondedAt", sos.getRespondedAt()); item.put("resolvedAt", sos.getResolvedAt());
                item.put("createdAt", sos.getCreatedAt()); item.put("updatedAt", sos.getUpdatedAt());
                item.put("routeName", route != null ? route.getName() : "");
                User reporter = userMap.get(sos.getUserId());
                item.put("reporterName", reporter != null ? reporter.getName() : "");
                item.put("reporterPhone", reporter != null ? reporter.getPhone() : "");
                visible.add(item);
            }
        }
        return visible;
    }

    @Transactional
    public SosAlert respondSos(String sosId, String responseText, User currentUser) {
        SosAlert sos = sosAlertRepository.findById(sosId).orElseThrow(() -> new NoSuchElementException("SOS alert not found."));
        Route route = sos.getRouteId() != null ? routeRepository.findById(sos.getRouteId()).orElse(null) : null;
        if (!canUserHandleSos(currentUser, sos, route)) throw new SecurityException("You are not allowed to respond to this SOS.");
        if (sos.getStatus() == SosStatus.resolved) throw new IllegalStateException("This SOS is already resolved.");

        String resp = responseText != null && !responseText.isBlank() ? responseText.trim() : "Help is on the way. Please stay safe.";
        sos.setStatus(SosStatus.responded); sos.setResponse(resp); sos.setResponderId(currentUser.getId());
        sos.setResponderName(currentUser.getName()); sos.setResponderRole(currentUser.getRole().name());
        sos.setRespondedAt(LocalDateTime.now());
        sos = sosAlertRepository.save(sos);

        notificationService.notifyMany(sosStakeholderIds(sos, route), "\u2705", "SOS Responded",
                currentUser.getName() + " responded: " + resp,
                Map.of("type", "sos_response", "sosId", sos.getId(), "sosStatus", "responded",
                        "responderName", currentUser.getName(), "responderRole", currentUser.getRole().name(),
                        "routeId", route != null ? route.getId() : "", "routeName", route != null ? route.getName() : ""));
        return sos;
    }

    @Transactional
    public SosAlert resolveSos(String sosId, String responseText, User currentUser) {
        SosAlert sos = sosAlertRepository.findById(sosId).orElseThrow(() -> new NoSuchElementException("SOS alert not found."));
        Route route = sos.getRouteId() != null ? routeRepository.findById(sos.getRouteId()).orElse(null) : null;
        if (!canUserHandleSos(currentUser, sos, route)) throw new SecurityException("You are not allowed to resolve this SOS.");

        String resp = responseText != null && !responseText.isBlank() ? responseText.trim() :
                (sos.getResponse() != null && !sos.getResponse().isBlank() ? sos.getResponse() : "SOS has been resolved.");
        sos.setStatus(SosStatus.resolved); sos.setResponse(resp); sos.setResponderId(currentUser.getId());
        sos.setResponderName(currentUser.getName()); sos.setResponderRole(currentUser.getRole().name());
        if (sos.getRespondedAt() == null) sos.setRespondedAt(LocalDateTime.now());
        sos.setResolvedAt(LocalDateTime.now());
        sos = sosAlertRepository.save(sos);

        notificationService.notifyMany(sosStakeholderIds(sos, route), "\u2705", "SOS Resolved",
                currentUser.getName() + " resolved the SOS. " + resp,
                Map.of("type", "sos_resolved", "sosId", sos.getId(), "sosStatus", "resolved",
                        "responderName", currentUser.getName(), "responderRole", currentUser.getRole().name(),
                        "routeId", route != null ? route.getId() : "", "routeName", route != null ? route.getName() : ""));
        return sos;
    }

    private boolean canUserHandleSos(User user, SosAlert sos, Route route) {
        if (user.getRole() == UserRole.superadmin) return true;
        if (user.getRole() == UserRole.admin && route != null && route.getOrgId() != null && route.getOrgId().equals(user.getOrgId())) return true;
        if (user.getRole() == UserRole.driver && route != null)
            return user.getId().equals(route.getDriverId()) || (user.getRouteId() != null && user.getRouteId().equals(route.getId()));
        return false;
    }

    private List<String> sosStakeholderIds(SosAlert sos, Route route) {
        Set<String> ids = new LinkedHashSet<>();
        if (sos.getUserId() != null) ids.add(sos.getUserId());
        if (route != null && route.getOrgId() != null) ids.addAll(tripService.getAdminIdsForOrg(route.getOrgId()));
        if (route != null) ids.addAll(tripService.getDriverIdsForRoute(route));
        if (sos.getType() == SosType.driver && route != null) {
            userRepository.findByRouteIdAndApprovedAndActive(route.getId(), true, true).forEach(p -> ids.add(p.getId()));
            ids.addAll(tripService.getSuperAdminIds());
        }
        ids.remove(null); ids.remove("");
        return new ArrayList<>(ids);
    }
}
