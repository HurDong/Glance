package com.glance.domain.notification.repository;

import com.glance.domain.notification.entity.Notification;
import com.glance.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("select n from Notification n left join fetch n.sender where n.receiver = :receiver order by n.createdAt desc")
    List<Notification> findByReceiverWithSender(@Param("receiver") Member receiver);
    
    long countByReceiverAndIsReadFalse(Member receiver);
}
