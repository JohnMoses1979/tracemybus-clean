package com.tracemybus.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracemybus.api.entity.Route;
import com.tracemybus.api.entity.Trip;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.UserRole;
import com.tracemybus.api.repository.RouteRepository;
import com.tracemybus.api.repository.TripRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final TripRepository tripRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public List<User> getUsers(User currentUser) {
        if (currentUser.getRole() == UserRole.superadmin) {
            return userRepository.findByActiveOrderByCreatedAtDesc(true);
        } else if (currentUser.getOrgId() != null && !currentUser.getOrgId().isBlank()) {
            List<User> orgUsers = new ArrayList<>(userRepository.findByActiveAndOrgIdOrderByCreatedAtDesc(true, currentUser.getOrgId()));
            boolean selfIncluded = orgUsers.stream().anyMatch(u -> u.getId().equals(currentUser.getId()));
            if (!selfIncluded) orgUsers.add(0, currentUser);
            return orgUsers.stream().filter(u -> u.getRole() != UserRole.superadmin).toList();
        }
        return List.of(currentUser);
    }

    @Transactional
    public User updateProfile(User currentUser, Map<String, Object> updates) {
        updates.remove("id"); updates.remove("role"); updates.remove("phone");
        updates.remove("passwordHash"); updates.remove("approved"); updates.remove("active");

        if (updates.containsKey("name")) {
            String name = String.valueOf(updates.get("name"));
            currentUser.setName(name);
            currentUser.setInitials(DateTimeUtils.initials(name));
        }
        if (updates.containsKey("email")) currentUser.setEmail(String.valueOf(updates.get("email")));
        if (updates.containsKey("stop")) currentUser.setStop(String.valueOf(updates.get("stop")));
        if (updates.containsKey("childName")) currentUser.setChildName(String.valueOf(updates.get("childName")));
        if (updates.containsKey("childClass")) currentUser.setChildClass(String.valueOf(updates.get("childClass")));
        if (updates.containsKey("childRollNo")) currentUser.setChildRollNo(String.valueOf(updates.get("childRollNo")));
        if (updates.containsKey("department")) currentUser.setDepartment(String.valueOf(updates.get("department")));
        if (updates.containsKey("empId")) currentUser.setEmpId(String.valueOf(updates.get("empId")));
        if (updates.containsKey("shiftTime")) currentUser.setShiftTime(String.valueOf(updates.get("shiftTime")));
        if (updates.containsKey("license")) currentUser.setLicense(String.valueOf(updates.get("license")));
        if (updates.containsKey("experience")) currentUser.setExperience(String.valueOf(updates.get("experience")));
        if (updates.containsKey("notificationEnabled")) {
            currentUser.setNotificationEnabled(Boolean.parseBoolean(String.valueOf(updates.get("notificationEnabled"))));
        }

        return userRepository.save(currentUser);
    }

    @Transactional
    public User updatePushToken(User currentUser, String token, String platform) {
        currentUser.setExpoPushToken(token != null ? token.trim() : "");
        currentUser.setPushPlatform(platform != null ? platform.trim() : "");
        currentUser.setPushTokenUpdatedAt(LocalDateTime.now());
        return userRepository.save(currentUser);
    }

    @Transactional
    public User assignRoute(String userId, String routeId, String stop) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("Passenger not found."));
        Route route = routeRepository.findById(routeId).orElseThrow(() -> new NoSuchElementException("Route not found."));

        String oldRouteId = user.getRouteId();
        List<String> stops = parseStops(route.getStops());
        List<String> pickupStops = stops.size() > 1 ? stops.subList(0, stops.size() - 1) : stops;
        String selectedStop = (stop != null && !stop.isBlank()) ? stop :
                (user.getStop() != null && !user.getStop().isBlank()) ? user.getStop() :
                (!pickupStops.isEmpty() ? pickupStops.get(0) : "");

        user.setRouteId(routeId);
        user.setStop(selectedStop);
        userRepository.save(user);

        if (oldRouteId != null) {
            tripRepository.findByRouteId(oldRouteId).ifPresent(oldTrip -> {
                removePassengerFromTrip(oldTrip, userId);
                tripRepository.save(oldTrip);
            });
        }

        tripRepository.findByRouteId(routeId).ifPresent(trip -> {
            addPassengerToTrip(trip, userId);
            tripRepository.save(trip);
        });

        notificationService.createNotification(userId, "\uD83D\uDE8C", "Route Updated",
                "You have been assigned to " + route.getName() + " at " + selectedStop + ".", Map.of());
        return user;
    }

    @Transactional
    public User removeRoute(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("Passenger not found."));
        String oldRouteId = user.getRouteId();
        user.setRouteId(null);
        user.setStop("");
        userRepository.save(user);

        if (oldRouteId != null) {
            tripRepository.findByRouteId(oldRouteId).ifPresent(trip -> {
                removePassengerFromTrip(trip, userId);
                tripRepository.save(trip);
            });
        }

        notificationService.createNotification(userId, "\uD83D\uDE8C", "Route Removed",
                "Your route assignment was removed by admin.", Map.of());
        return user;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseStatusMap(String json) {
        try { return json != null ? new HashMap<>(objectMapper.readValue(json, Map.class)) : new HashMap<>(); }
        catch (Exception e) { return new HashMap<>(); }
    }

    private List<String> parseStops(String json) {
        try { return json != null ? objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)) : new ArrayList<>(); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    private void removePassengerFromTrip(Trip trip, String userId) {
        Map<String, String> pickup = parseStatusMap(trip.getPickupStatus());
        Map<String, String> ret = parseStatusMap(trip.getReturnStatus());
        pickup.remove(userId); ret.remove(userId);
        try { trip.setPickupStatus(objectMapper.writeValueAsString(pickup)); trip.setReturnStatus(objectMapper.writeValueAsString(ret)); }
        catch (Exception e) { /* ignore */ }
    }

    private void addPassengerToTrip(Trip trip, String userId) {
        Map<String, String> pickup = parseStatusMap(trip.getPickupStatus());
        Map<String, String> ret = parseStatusMap(trip.getReturnStatus());
        pickup.put(userId, "waiting"); ret.put(userId, "waiting");
        try { trip.setPickupStatus(objectMapper.writeValueAsString(pickup)); trip.setReturnStatus(objectMapper.writeValueAsString(ret)); }
        catch (Exception e) { /* ignore */ }
    }
}
