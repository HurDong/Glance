package com.glance.domain.stocks.dto;

import lombok.Builder;

public record StockPriceMessage(
        String symbol,
        String price,
        String change,
        String changeRate,
        String volume,
        String time) {
    @Builder
    public StockPriceMessage {
    }
}
