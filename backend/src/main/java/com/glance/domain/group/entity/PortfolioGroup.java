package com.glance.domain.group.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicUpdate;

import java.util.UUID;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicUpdate
@Table(name = "portfolio_group")
public class PortfolioGroup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 10)
    private String inviteCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private Member owner;

    @Builder
    public PortfolioGroup(String name, String description, Member owner) {
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.inviteCode = generateShortCode();
    }

    private String generateShortCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public void updateInfo(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
