package com.glance.domain.stocks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestStockResponse {
    private Long id;
    private String symbol;
    private String market;
    private String nameKr;
    private String nameEn;
    private String securityType;
}
