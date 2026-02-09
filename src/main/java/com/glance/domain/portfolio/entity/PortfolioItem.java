package com.glance.domain.portfolio.entity;

import com.glance.common.entity.BaseTimeEntity;
import com.glance.domain.stocks.entity.StockSymbol;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.DynamicUpdate;
import java.math.BigDecimal;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicUpdate
public class PortfolioItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_symbol_id", nullable = false)
    private StockSymbol stockSymbol;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private BigDecimal averagePrice;

    @Column(nullable = false, length = 3)
    private String currency; // USD, KRW

    public void setPortfolio(Portfolio portfolio) {
        this.portfolio = portfolio;
    }

    @Builder
    public PortfolioItem(StockSymbol stockSymbol, BigDecimal quantity, BigDecimal averagePrice, String currency) {
        this.stockSymbol = stockSymbol;
        this.quantity = quantity;
        this.averagePrice = averagePrice;
        this.currency = currency;
    }
}
