package com.tracemybus.api.repository;

import com.tracemybus.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId")
    void markAllReadByUserId(String userId);
}
