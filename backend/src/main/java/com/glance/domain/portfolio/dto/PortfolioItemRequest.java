package com.glance.domain.portfolio.dto;

import java.math.BigDecimal;

public record PortfolioItemRequest(
        String symbol,
        BigDecimal quantity,
        BigDecimal averagePrice,
        String currency // "USD", "KRW"
) {
}
