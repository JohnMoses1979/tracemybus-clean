package com.tracemybus.api.seed;

import com.tracemybus.api.entity.Organization;
import com.tracemybus.api.entity.Route;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.OrgType;
import com.tracemybus.api.enums.UserRole;
import com.tracemybus.api.repository.OrganizationRepository;
import com.tracemybus.api.repository.RouteRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.util.DateTimeUtils;
import com.tracemybus.api.util.PhoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.boot.CommandLineRunner;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";
    private static final String ORG_ID = "seed_org_trace_school";
    private static final String ROUTE_ID = "seed_route_trace_school_1";

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final RouteRepository routeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        User superAdmin = upsertUser(
                "superadmin_main",
                UserRole.superadmin,
                "Super Admin",
                "9988776655",
                "superadmin@tracemybus.com",
                null,
                "",
                null,
                "",
                "[]"
        );

        User admin = upsertUser(
                "admin_main",
                UserRole.admin,
                "Admin",
                "1234567890",
                "admin@tracemybus.com",
                ORG_ID,
                "TraceMyBus School",
                null,
                "",
                "[]"
        );

        Organization org = organizationRepository.findById(ORG_ID).orElseGet(Organization::new);
        org.setId(ORG_ID);
        org.setName("TraceMyBus School");
        org.setType(OrgType.school);
        org.setAddress("TraceMyBus default organisation");
        org.setPhone(admin.getPhone());
        org.setAdminId(admin.getId());
        org.setColor("#2E7D32");
        org.setActive(true);
        org.setNotificationEnabled(true);
        organizationRepository.save(org);

        User driver = upsertUser(
                "driver_main",
                UserRole.driver,
                "Driver",
                "1123456789",
                "driver@tracemybus.com",
                ORG_ID,
                org.getName(),
                ROUTE_ID,
                "",
                "[]"
        );
        driver.setLicense("DL-TRACE-001");
        driver.setExperience("5 years");
        userRepository.save(driver);

        Route route = routeRepository.findById(ROUTE_ID).orElseGet(Route::new);
        route.setId(ROUTE_ID);
        route.setOrgId(ORG_ID);
        route.setName("Route 1");
        route.setBusNo("BUS-01");
        route.setVehicleNo("TRACE-001");
        route.setDriverId(driver.getId());
        route.setDriverName(driver.getName());
        route.setStartTime("08:00 AM");
        route.setReturnTime("04:00 PM");
        route.setStops("[\"Stop 1\",\"Stop 2\",\"TraceMyBus School\"]");
        route.setActive(true);
        route.setExtra("{}");
        routeRepository.save(route);

        User school = upsertUser(
                "school_user_main",
                UserRole.school,
                "School User",
                "0123456789",
                "school@tracemybus.com",
                ORG_ID,
                org.getName(),
                ROUTE_ID,
                "Stop 1",
                "[{\"id\":\"child_seed_1\",\"name\":\"Student\",\"className\":\"10th\",\"rollNo\":\"001\"}]"
        );
        school.setChildName("Student");
        school.setChildClass("10th");
        school.setChildRollNo("001");
        userRepository.save(school);

        log.info("✅ Hardcoded TraceMyBus credentials ready");
        log.info("SuperAdmin: {} / {}", superAdmin.getPhone(), DEFAULT_PASSWORD);
        log.info("Admin: {} / {}", admin.getPhone(), DEFAULT_PASSWORD);
        log.info("School: {} / {}", school.getPhone(), DEFAULT_PASSWORD);
        log.info("Driver: {} / {}", driver.getPhone(), DEFAULT_PASSWORD);
    }

    private User upsertUser(
            String preferredId,
            UserRole role,
            String name,
            String phone,
            String email,
            String orgId,
            String orgName,
            String routeId,
            String stop,
            String children
    ) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        User user = userRepository.findByPhone(cleanPhone)
                .or(() -> userRepository.findById(preferredId))
                .orElseGet(User::new);

        if (user.getId() == null || user.getId().isBlank()) user.setId(preferredId);
        user.setRole(role);
        user.setName(name);
        user.setPhone(cleanPhone);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setOrg(orgName != null ? orgName : "");
        user.setOrgId(orgId);
        user.setRouteId(routeId);
        user.setStop(stop != null ? stop : "");
        user.setChildren(children != null ? children : "[]");
        user.setInitials(DateTimeUtils.initials(name));
        user.setApproved(true);
        user.setActive(true);
        user.setNotificationEnabled(true);
        if (user.getExpoPushToken() == null) user.setExpoPushToken("");
        if (user.getPushPlatform() == null) user.setPushPlatform("");
        return userRepository.save(user);
    }
}
