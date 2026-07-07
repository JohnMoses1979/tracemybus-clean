package com.tracemybus.api.repository;

import com.tracemybus.api.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, String> {
    List<Organization> findByActiveOrderByCreatedAtDesc(Boolean active);
    List<Organization> findAllByOrderByCreatedAtDesc();
}
