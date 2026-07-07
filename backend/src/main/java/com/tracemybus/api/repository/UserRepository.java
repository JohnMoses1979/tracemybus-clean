package com.tracemybus.api.repository;

import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByPhone(String phone);
    Optional<User> findByPhoneAndApprovedAndActive(String phone, Boolean approved, Boolean active);
    Optional<User> findByPhoneAndActive(String phone, Boolean active);
    List<User> findByRoleAndApprovedAndActive(UserRole role, Boolean approved, Boolean active);
    List<User> findByRoleAndOrgIdAndApprovedAndActive(UserRole role, String orgId, Boolean approved, Boolean active);
    List<User> findByRoleAndRouteIdAndApprovedAndActive(UserRole role, String routeId, Boolean approved, Boolean active);
    List<User> findByRouteIdAndApprovedAndActive(String routeId, Boolean approved, Boolean active);
    List<User> findByOrgIdAndActiveAndRoleNot(String orgId, Boolean active, UserRole role);
    List<User> findByOrgIdAndActiveAndRoleIn(String orgId, Boolean active, List<UserRole> roles);
    List<User> findByActiveOrderByCreatedAtDesc(Boolean active);
    List<User> findByActiveAndOrgIdOrderByCreatedAtDesc(Boolean active, String orgId);
    boolean existsByPhone(String phone);
    boolean existsByEmailIgnoreCase(String email);
}
