package com.glance.domain.stocks.dto;

import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.entity.StockStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StockResponse {
    private String symbol;
    private String nameKr;
    private String nameEn;
    private Market market;
    private StockStatus status;

    public static StockResponse from(StockSymbol entity) {
        return StockResponse.builder()
                .symbol(entity.getSymbol())
                .nameKr(entity.getNameKr())
                .nameEn(entity.getNameEn())
                .market(entity.getMarket())
                .status(entity.getStatus())
                .build();
    }
}
