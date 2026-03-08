package com.glance.domain.group.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "group_portfolio_reaction",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"member_id", "group_membership_id", "type"})
       })
public class GroupPortfolioReaction extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member; // 반응을 남긴 사람

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_membership_id", nullable = false)
    private PortfolioGroupMember targetMembership; // 반응 대상 (공유된 포트폴리오)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReactionType type;
}
