package com.tracemybus.api.repository;

import com.tracemybus.api.entity.SosAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SosAlertRepository extends JpaRepository<SosAlert, String> {
    List<SosAlert> findAllByOrderByCreatedAtDesc();
}
