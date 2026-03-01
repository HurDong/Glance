package com.glance.domain.portfolio.dto;

import java.math.BigDecimal;

public record PortfolioItemRequest(
                String symbol,
                String market, // e.g. "NASDAQ", "KOSPI", "CASH" — null이면 symbol만으로 조회
                BigDecimal quantity,
                BigDecimal averagePrice,
                String currency // "USD", "KRW"
) {
}
