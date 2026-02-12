package com.glance.domain.stocks.entity;

import com.glance.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicUpdate
@Table(indexes = {
        @Index(name = "idx_symbol_market", columnList = "symbol, market", unique = true)
})
public class StockSymbol extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String symbol; // Ticker Symbol (e.g. AAPL, 005930)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Market market;

    private String nameKr;

    private String nameEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(20) DEFAULT 'STOCK'")
    private SecurityType securityType;

    @Builder
    public StockSymbol(String symbol, Market market, String nameKr, String nameEn, StockStatus status,
            SecurityType securityType) {
        this.symbol = symbol;
        this.market = market;
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.status = status;
        this.securityType = securityType != null ? securityType : SecurityType.STOCK;
    }

    public void updateInfo(String nameKr, String nameEn, StockStatus status, SecurityType securityType) {
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.status = status;
        if (securityType != null) {
            this.securityType = securityType;
        }
    }

    public void markDelisted() {
        this.status = StockStatus.DELISTED;
    }
}
