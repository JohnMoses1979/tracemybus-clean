package com.tracemybus.api.repository;

import com.tracemybus.api.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {
    Optional<Trip> findByRouteId(String routeId);
    void deleteByRouteId(String routeId);
}
