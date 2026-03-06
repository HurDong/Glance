package com.glance.domain.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.glance.domain.notification.entity.Notification;
import com.glance.domain.notification.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String content;
    private String targetId;
    
    @JsonProperty("isRead")
    private boolean isRead;
    
    private String senderNickname;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .content(notification.getContent())
                .targetId(notification.getTargetId())
                .isRead(notification.isRead())
                .senderNickname(notification.getSender() != null ? notification.getSender().getNickname() : "시스템")
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
