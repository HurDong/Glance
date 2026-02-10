package com.glance.domain.group.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.member.entity.Member;
import com.glance.domain.portfolio.entity.Portfolio;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "portfolio_group_member")
public class PortfolioGroupMember extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private PortfolioGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_portfolio_id")
    private Portfolio sharedPortfolio;

    @Builder
    public PortfolioGroupMember(PortfolioGroup group, Member member, Portfolio sharedPortfolio) {
        this.group = group;
        this.member = member;
        this.sharedPortfolio = sharedPortfolio;
    }

    public void sharePortfolio(Portfolio portfolio) {
        this.sharedPortfolio = portfolio;
    }

    public void unsharePortfolio() {
        this.sharedPortfolio = null;
    }
}
