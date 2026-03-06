package com.glance.domain.notification.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "notifications")
public class Notification extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private Member receiver; // 알림 수신자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private Member sender; // 알림 발신자 (선택 사항)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String content;

    @Column
    private String targetId; // 클릭 시 이동할 ID (groupId, portfolioId 등)

    @Column(nullable = false)
    private boolean isRead;

    public void markAsRead() {
        this.isRead = true;
    }
}
