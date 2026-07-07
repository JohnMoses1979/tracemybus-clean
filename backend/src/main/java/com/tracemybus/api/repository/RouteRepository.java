package com.tracemybus.api.repository;

import com.tracemybus.api.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteRepository extends JpaRepository<Route, String> {
    List<Route> findByActiveOrderByCreatedAtDesc(Boolean active);
    List<Route> findByOrgIdAndActiveOrderByCreatedAtDesc(String orgId, Boolean active);
    List<Route> findAllByOrderByCreatedAtDesc();
}
