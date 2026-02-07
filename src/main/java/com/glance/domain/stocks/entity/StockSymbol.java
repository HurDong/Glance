package com.glance.domain.stocks.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicUpdate
@Table(indexes = {
        @Index(name = "idx_symbol_market", columnList = "symbol, market", unique = true)
})
public class StockSymbol {

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

    private LocalDateTime updatedAt;

    @Builder
    public StockSymbol(String symbol, Market market, String nameKr, String nameEn, StockStatus status) {
        this.symbol = symbol;
        this.market = market;
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateInfo(String nameKr, String nameEn, StockStatus status) {
        this.nameKr = nameKr;
        this.nameEn = nameEn;
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public void markDelisted() {
        this.status = StockStatus.DELISTED;
        this.updatedAt = LocalDateTime.now();
    }
}
