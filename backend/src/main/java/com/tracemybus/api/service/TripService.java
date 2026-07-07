package com.tracemybus.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracemybus.api.entity.*;
import com.tracemybus.api.enums.SosType;
import com.tracemybus.api.enums.TripStatus;
import com.tracemybus.api.enums.UserRole;
import com.tracemybus.api.repository.*;
import com.tracemybus.api.util.DateTimeUtils;
import com.tracemybus.api.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final SosAlertRepository sosAlertRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public record RouteTrip(Route route, Trip trip) {}

    @Transactional
    public RouteTrip getOrCreateTrip(String routeId) {
        Route route = routeRepository.findById(routeId).orElse(null);
        if (route == null) return new RouteTrip(null, null);

        Trip trip = tripRepository.findByRouteId(routeId).orElse(null);
        if (trip == null) {
            trip = Trip.builder()
                    .id(IdGenerator.makeId("trip")).routeId(routeId).orgId(route.getOrgId())
                    .status(TripStatus.not_started).direction("pickup").gpsOn(false)
                    .currentStopIndex(0).eta(0).speed(0).delayMinutes(0)
                    .pickupStatus("{}").returnStatus("{}").logs("[]")
                    .build();
            trip = tripRepository.save(trip);
        }
        return new RouteTrip(route, trip);
    }

    @Transactional
    public Trip startTrip(String routeId, String direction) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");

        Trip trip = rt.trip(); Route route = rt.route();
        List<User> passengers = userRepository.findByRouteIdAndApprovedAndActive(routeId, true, true);
        List<String> activeStops = getStopsForDirection(route, direction);

        Map<String, String> passengerStatus = passengers.stream()
                .collect(Collectors.toMap(User::getId, p -> "waiting", (a, b) -> a));
        String statusJson = toJson(passengerStatus);
        String label = "return".equals(direction) ? "Return" : "Pickup";

        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] " + label + " trip started");

        trip.setStatus(TripStatus.live); trip.setDirection(direction); trip.setGpsOn(true);
        trip.setCurrentStopIndex(0); trip.setEta(Math.max(0, (activeStops.size() - 1) * 4));
        trip.setSpeed(0); trip.setDelayMinutes(0); trip.setStartedAt(DateTimeUtils.timeNow()); trip.setEndedAt(null);

        if ("return".equals(direction)) trip.setReturnStatus(statusJson); else trip.setPickupStatus(statusJson);
        trip.setLogs(toJson(logsList));
        trip = tripRepository.save(trip);

        List<String> notifyIds = new ArrayList<>(passengers.stream().map(User::getId).toList());
        notifyIds.addAll(getAdminIdsForOrg(route.getOrgId()));
        notificationService.notifyMany(notifyIds, "\uD83D\uDE8C", label + " Trip Started",
                route.getName() + " " + label.toLowerCase() + " route has started. Bus is now live!");
        return trip;
    }

    @Transactional
    public Trip endTrip(String routeId) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");

        Trip trip = rt.trip(); Route route = rt.route();
        String label = "return".equals(trip.getDirection()) ? "Return" : "Pickup";

        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] " + label + " trip completed — reached destination");

        trip.setStatus(TripStatus.completed); trip.setGpsOn(false); trip.setEndedAt(DateTimeUtils.timeNow());
        trip.setLogs(toJson(logsList));
        trip = tripRepository.save(trip);

        List<User> passengers = userRepository.findByRouteIdAndApprovedAndActive(routeId, true, true);
        List<String> notifyIds = new ArrayList<>(passengers.stream().map(User::getId).toList());
        notifyIds.addAll(getAdminIdsForOrg(route.getOrgId()));
        notificationService.notifyMany(notifyIds, "\uD83C\uDFC1", label + " Trip Completed",
                route.getName() + " has reached the destination.");
        return trip;
    }

    @Transactional
    public Trip nextStop(String routeId) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");
        Trip trip = rt.trip(); Route route = rt.route();

        if (trip.getStatus() != TripStatus.live) throw new IllegalStateException("Please start the trip before moving to next stop.");

        List<String> stops = getStopsForDirection(route, trip.getDirection());
        int newIdx = Math.min((trip.getCurrentStopIndex() != null ? trip.getCurrentStopIndex() : 0) + 1, Math.max(0, stops.size() - 1));
        String newStop = newIdx < stops.size() ? stops.get(newIdx) : "next stop";

        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] Moved to: " + newStop);

        trip.setCurrentStopIndex(newIdx);
        trip.setEta(Math.max(0, (trip.getEta() != null ? trip.getEta() : 0) - 4));
        trip.setSpeed(30 + new Random().nextInt(25));
        trip.setLogs(toJson(logsList));
        trip = tripRepository.save(trip);

        List<User> passengers = userRepository.findByRouteIdAndApprovedAndActive(routeId, true, true);
        String finalStop = newStop;
        notificationService.notifyMany(passengers.stream().filter(p -> finalStop.equals(p.getStop())).map(User::getId).toList(),
                "\uD83D\uDE8C", "Bus Approaching", "Bus is approaching your stop: " + newStop);
        notificationService.notifyMany(getAdminIdsForOrg(route.getOrgId()), "\uD83D\uDCCD", "Stop Updated",
                (route.getBusNo() != null && !route.getBusNo().isBlank() ? route.getBusNo() : route.getName()) + " moved to next stop.");
        return trip;
    }

    @Transactional
    public Trip updatePassengerStatus(String routeId, String passengerId, String status, User currentUser) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");
        Trip trip = rt.trip(); Route route = rt.route();

        if (trip.getStatus() != TripStatus.live) throw new IllegalStateException("Please start the trip before marking pickup, drop, absent, or editing passenger status.");

        User passenger = userRepository.findById(passengerId).orElseThrow(() -> new NoSuchElementException("Passenger not found."));

        boolean isReturn = "return".equals(trip.getDirection());
        String mapJson = isReturn ? trip.getReturnStatus() : trip.getPickupStatus();
        List<String> stops = getStopsForDirection(route, trip.getDirection());
        String stop = (trip.getCurrentStopIndex() != null && trip.getCurrentStopIndex() < stops.size())
                ? stops.get(trip.getCurrentStopIndex()) : (passenger.getStop() != null ? passenger.getStop() : "stop");
        String dName = DateTimeUtils.displayName(passenger.getChildName(), passenger.getName());
        String actionText = "waiting".equals(status) ? "Reset to waiting" : "absent".equals(status) ? "Marked absent" : isReturn ? "Dropped" : "Picked up";

        Map<String, String> statusMap = parseStatusMap(mapJson);
        statusMap.put(passengerId, status);
        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] " + actionText + ": " + dName + " at " + stop);

        String updatedJson = toJson(statusMap);
        if (isReturn) trip.setReturnStatus(updatedJson); else trip.setPickupStatus(updatedJson);
        trip.setLogs(toJson(logsList));
        trip = tripRepository.save(trip);

        List<String> adminIds = getAdminIdsForOrg(route.getOrgId());
        if ("pickedup".equals(status)) {
            String msg = isReturn ? dName + " has been dropped at " + stop + "." : dName + " has been picked up.";
            notificationService.createNotification(passengerId, "\u2705", isReturn ? "Dropped Safely" : "Picked Up!", msg, Map.of());
            notificationService.notifyMany(adminIds, "\u2705", isReturn ? "Drop Updated" : "Pickup", dName + (isReturn ? " dropped" : " picked up") + " at " + stop + ".");
        } else if ("absent".equals(status)) {
            notificationService.createNotification(passengerId, "\u274C", "Marked Absent", dName + " was marked absent. Contact driver if incorrect.", Map.of());
            notificationService.notifyMany(adminIds, "\u274C", "Absent", dName + " marked absent.");
        } else {
            notificationService.notifyMany(adminIds, "\u270F\uFE0F", "Status Edited", dName + " status reset to waiting by driver.");
        }
        return trip;
    }

    @Transactional
    public Trip reportDelay(String routeId) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");
        Trip trip = rt.trip(); Route route = rt.route();
        if (trip.getStatus() != TripStatus.live) throw new IllegalStateException("Please start the trip before reporting delay.");

        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] Delay reported: +10 minutes");
        trip.setDelayMinutes((trip.getDelayMinutes() != null ? trip.getDelayMinutes() : 0) + 10);
        trip.setEta((trip.getEta() != null ? trip.getEta() : 0) + 10);
        trip.setLogs(toJson(logsList));
        trip = tripRepository.save(trip);

        List<User> passengers = userRepository.findByRouteIdAndApprovedAndActive(routeId, true, true);
        List<String> notifyIds = new ArrayList<>(passengers.stream().map(User::getId).toList());
        notifyIds.addAll(getAdminIdsForOrg(route.getOrgId()));
        notificationService.notifyMany(notifyIds, "\u26A0\uFE0F", "Bus Delay", route.getName() + " is running 10 minutes late.");
        return trip;
    }

    @Transactional
    public Trip toggleGps(String routeId) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");
        Trip trip = rt.trip();
        List<String> logsList = parseLogs(trip.getLogs());
        logsList.add(0, "[" + DateTimeUtils.timeNow() + "] GPS " + (Boolean.TRUE.equals(trip.getGpsOn()) ? "OFF" : "ON"));
        trip.setGpsOn(!Boolean.TRUE.equals(trip.getGpsOn()));
        trip.setLogs(toJson(logsList));
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip updateLocation(String routeId, User currentUser, Double latitude, Double longitude,
                               Double speedKmh, Double heading, Double accuracy,
                               String locationAddress, String locationCity, String locationRegion,
                               String locationPostalCode, String locationCountry, String locationLabel) {
        RouteTrip rt = getOrCreateTrip(routeId);
        if (rt.route() == null || rt.trip() == null) throw new NoSuchElementException("Trip/route not found.");
        Trip trip = rt.trip(); Route route = rt.route();

        boolean isDriver = currentUser.getRole() == UserRole.driver &&
                (routeId.equals(currentUser.getRouteId()) || currentUser.getId().equals(route.getDriverId())
                        || (route.getDriverName() != null && route.getDriverName().equals(currentUser.getName())));
        boolean canUpdate = isDriver || currentUser.getRole() == UserRole.admin || currentUser.getRole() == UserRole.superadmin;
        if (!canUpdate) throw new SecurityException("You are not allowed to update this trip location.");
        if (trip.getStatus() != TripStatus.live) throw new IllegalStateException("Start the trip before sharing live GPS location.");
        if (!Boolean.TRUE.equals(trip.getGpsOn())) throw new IllegalStateException("GPS sharing is OFF for this trip.");

        int speed = speedKmh != null ? (int) Math.max(0, Math.round(speedKmh)) : (trip.getSpeed() != null ? trip.getSpeed() : 0);
        trip.setLatitude(latitude); trip.setLongitude(longitude); trip.setHeading(heading); trip.setAccuracy(accuracy);
        trip.setSpeed(speed); trip.setLocationUpdatedAt(LocalDateTime.now());
        trip.setLocationAddress(orDefault(locationAddress, trip.getLocationAddress()));
        trip.setLocationCity(orDefault(locationCity, trip.getLocationCity()));
        trip.setLocationRegion(orDefault(locationRegion, trip.getLocationRegion()));
        trip.setLocationPostalCode(orDefault(locationPostalCode, trip.getLocationPostalCode()));
        trip.setLocationCountry(orDefault(locationCountry, trip.getLocationCountry()));
        String label = (locationLabel != null && !locationLabel.isBlank()) ? locationLabel :
                (locationAddress != null && !locationAddress.isBlank()) ? locationAddress :
                        joinNonBlank(locationCity, locationRegion);
        trip.setLocationLabel(orDefault(label, trip.getLocationLabel()));
        trip = tripRepository.save(trip);

        // WebSocket broadcast
        Map<String, Object> ws = new LinkedHashMap<>();
        ws.put("routeId", routeId); ws.put("latitude", latitude); ws.put("longitude", longitude);
        ws.put("heading", heading); ws.put("accuracy", accuracy); ws.put("speed", speed);
        ws.put("locationUpdatedAt", trip.getLocationUpdatedAt());
        ws.put("locationAddress", trip.getLocationAddress()); ws.put("locationCity", trip.getLocationCity());
        ws.put("locationRegion", trip.getLocationRegion()); ws.put("locationLabel", trip.getLocationLabel());
        messagingTemplate.convertAndSend("/topic/route/" + routeId, ws);
        return trip;
    }

    @Transactional
    public SosAlert driverSos(String routeId, User currentUser) {
        Route route = routeRepository.findById(routeId).orElseThrow(() -> new NoSuchElementException("Route not found."));
        SosAlert sos = SosAlert.builder().id(IdGenerator.makeId("sos")).userId(currentUser.getId())
                .routeId(routeId).type(SosType.driver).message("Emergency on " + route.getName()).build();
        sos = sosAlertRepository.save(sos);

        List<String> notifyIds = new ArrayList<>(userRepository.findByRouteIdAndApprovedAndActive(routeId, true, true).stream().map(User::getId).toList());
        notifyIds.addAll(getAdminIdsForOrg(route.getOrgId())); notifyIds.addAll(getSuperAdminIds());

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("type", "sos"); extra.put("sosId", sos.getId()); extra.put("sosType", "driver");
        extra.put("routeId", routeId); extra.put("routeName", route.getName()); extra.put("status", "open");
        extra.put("sender", currentUser.getName()); extra.put("senderRole", currentUser.getRole().name());
        notificationService.notifyMany(notifyIds, "\uD83D\uDEA8", "Driver SOS!", "Emergency on " + route.getName() + "! Admin alerted.", extra);
        return sos;
    }

    // ---- Public helpers used by SosService ----

    public List<String> getDriverIdsForRoute(Route route) {
        if (route == null) return List.of();
        Set<String> ids = new HashSet<>();
        if (route.getDriverId() != null) ids.add(route.getDriverId());
        userRepository.findByRoleAndRouteIdAndApprovedAndActive(UserRole.driver, route.getId(), true, true)
                .forEach(d -> ids.add(d.getId()));
        return ids.stream().filter(Objects::nonNull).toList();
    }

    public List<String> getAdminIdsForOrg(String orgId) {
        if (orgId == null) return List.of();
        return userRepository.findByRoleAndOrgIdAndApprovedAndActive(UserRole.admin, orgId, true, true)
                .stream().map(User::getId).toList();
    }

    public List<String> getSuperAdminIds() {
        return userRepository.findByRoleAndApprovedAndActive(UserRole.superadmin, true, true)
                .stream().map(User::getId).toList();
    }

    // ---- Private helpers ----

    private List<String> getStopsForDirection(Route route, String direction) {
        List<String> stops = parseStopsList(route.getStops());
        if ("return".equals(direction)) { List<String> rev = new ArrayList<>(stops); Collections.reverse(rev); return rev; }
        return stops;
    }

    private List<String> parseStopsList(String json) {
        try { return json != null ? objectMapper.readValue(json, new TypeReference<>() {}) : new ArrayList<>(); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    private List<String> parseLogs(String json) {
        try { return json != null ? new ArrayList<>(objectMapper.readValue(json, new TypeReference<List<String>>() {})) : new ArrayList<>(); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseStatusMap(String json) {
        try { return json != null ? new HashMap<>(objectMapper.readValue(json, Map.class)) : new HashMap<>(); }
        catch (Exception e) { return new HashMap<>(); }
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "{}"; }
    }

    private String orDefault(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : (fallback != null ? fallback : "");
    }

    private String joinNonBlank(String... parts) {
        return Arrays.stream(parts).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(", "));
    }
}
