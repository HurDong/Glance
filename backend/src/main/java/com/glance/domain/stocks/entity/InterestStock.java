package com.glance.domain.stocks.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "interest_stock", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "member_id", "symbol" })
})
public class InterestStock extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false) // KR, US, etc.
    private String market;

    @Builder
    public InterestStock(Member member, String symbol, String market) {
        this.member = member;
        this.symbol = symbol;
        this.market = market;
    }
}
