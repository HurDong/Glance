package com.glance.domain.portfolio.dto;

import com.glance.domain.portfolio.entity.PortfolioItem;
import java.math.BigDecimal;

public record PortfolioItemResponse(
        Long id,
        String symbol,
        String nameKr,
        String nameEn,
        String market,
        BigDecimal quantity,
        BigDecimal averagePrice,
        String currency) {
    public static PortfolioItemResponse from(PortfolioItem item) {
        return new PortfolioItemResponse(
                item.getId(),
                item.getStockSymbol().getSymbol(),
                item.getStockSymbol().getNameKr(),
                item.getStockSymbol().getNameEn(),
                item.getStockSymbol().getMarket().name(),
                item.getQuantity(),
                item.getAveragePrice(),
                item.getCurrency());
    }
}
