package com.glance.domain.stocks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketIndexDto {
    private String symbol;
    private String name;
    private String price;
    private String change;
    private String changePercent;
    private String type; // US, KR, FOREX, CRYPTO, COMMODITY
}
