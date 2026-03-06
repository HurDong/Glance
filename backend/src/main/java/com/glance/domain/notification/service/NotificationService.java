package com.glance.domain.notification.service;

import com.glance.domain.member.entity.Member;
import com.glance.domain.notification.dto.NotificationResponse;
import com.glance.domain.notification.entity.Notification;
import com.glance.domain.notification.entity.NotificationType;
import com.glance.domain.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void sendNotification(Member receiver, Member sender, NotificationType type, String content, String targetId) {
        Notification notification = Notification.builder()
                .receiver(receiver)
                .sender(sender)
                .type(type)
                .content(content)
                .targetId(targetId)
                .isRead(false)
                .build();

        Notification savedNotification = notificationRepository.save(notification);

        // 실시간 웹소켓 푸시 (엔티티 대신 DTO 전송)
        // 구독 경로: /api/v1/sub/notifications/{memberId}
        String destination = "/api/v1/sub/notifications/" + receiver.getId();
        messagingTemplate.convertAndSend(destination, NotificationResponse.from(savedNotification));
        
        log.info("🔔 Notification sent to user {}: {}", receiver.getId(), content);
    }

    public List<Notification> getMyNotifications(Member member) {
        return notificationRepository.findByReceiverWithSender(member);
    }

    public long getUnreadCount(Member member) {
        return notificationRepository.countByReceiverAndIsReadFalse(member);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId)
                .ifPresent(notification -> {
                    notification.markAsRead();
                    notificationRepository.save(notification);
                });
    }

    @Transactional
    public void markAllAsRead(Member member) {
        notificationRepository.findByReceiverWithSender(member).forEach(Notification::markAsRead);
    }
}
