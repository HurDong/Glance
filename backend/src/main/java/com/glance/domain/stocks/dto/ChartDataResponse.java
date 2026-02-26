package com.glance.domain.stocks.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Builder
public class ChartDataResponse {
    private String symbol;
    private String range;
    private List<ChartPoint> data;

    @Getter
    @Setter
    @Builder
    public static class ChartPoint {
        private String date; // YYYYMMDD
        private Double price;
        private Long volume;
    }
}
