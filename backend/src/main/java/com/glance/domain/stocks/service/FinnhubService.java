package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.dto.ChartDataResponse;
import com.glance.domain.stocks.dto.ChartDataResponse.ChartPoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class FinnhubService { // Re-using the class name to maintain Dependency Injection without extra changes

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChartDataResponse getUsChartData(String symbol, String range) {
        try {
            // Mapping frontend ranges to Yahoo Finance ranges and intervals
            String interval;
            String yfRange;

            switch (range) {
                case "1m":
                    yfRange = "1d";
                    interval = "1m";
                    break;
                case "5m":
                    yfRange = "5d"; // Max 5 days for 5m interval usually
                    interval = "5m";
                    break;
                case "15m":
                    yfRange = "5d";
                    interval = "15m";
                    break;
                case "1h":
                    yfRange = "1mo";
                    interval = "60m";
                    break;
                case "1d":
                    yfRange = "6mo";
                    interval = "1d";
                    break;
                case "1w":
                    yfRange = "5y";
                    interval = "1wk";
                    break;
                case "1M":
                    yfRange = "10y";
                    interval = "1mo";
                    break;
                case "1Y":
                    yfRange = "max";
                    interval = "1mo"; // largest resolution Yahoo supports is monthly
                    break;
                default:
                    yfRange = "1mo";
                    interval = "1d";
            }

            String url = String.format(
                    "https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=%s",
                    symbol, yfRange, interval);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode result = root.path("chart").path("result").get(0);

            if (result == null || result.isMissingNode()) {
                throw new RuntimeException("No chart data from Yahoo Finance");
            }

            JsonNode timestamps = result.path("timestamp");
            JsonNode quote = result.path("indicators").path("quote").get(0);
            JsonNode closePrices = quote.path("close");
            JsonNode volumes = quote.path("volume");

            List<ChartPoint> points = new ArrayList<>();
            boolean isIntraday = interval.endsWith("m");

            if (timestamps != null && timestamps.isArray() && closePrices != null && closePrices.isArray()) {
                for (int i = 0; i < timestamps.size(); i++) {
                    if (closePrices.get(i).isNull()) continue; // Skip points with null closing price
                    
                    long ts = timestamps.get(i).asLong();
                    Instant instant = Instant.ofEpochSecond(ts);
                    String dateStr;

                    if (isIntraday) {
                        dateStr = DateTimeFormatter.ofPattern("yyyyMMddHHmm")
                                .withZone(ZoneId.of("America/New_York"))
                                .format(instant);
                    } else {
                        dateStr = DateTimeFormatter.ofPattern("yyyyMMdd")
                                .withZone(ZoneId.of("America/New_York"))
                                .format(instant);
                    }

                    long volume = volumes != null && volumes.has(i) && !volumes.get(i).isNull() ? volumes.get(i).asLong() : 0L;
                    points.add(ChartPoint.builder()
                            .date(dateStr)
                            .price(closePrices.get(i).asDouble())
                            .volume(volume)
                            .build());
                }
            }

            return ChartDataResponse.builder()
                    .symbol(symbol)
                    .range(range)
                    .data(points)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching US chart data from Yahoo Finance for {}", symbol, e);
            throw new RuntimeException("해외 주식 차트 데이터를 불러올 수 없습니다. (" + e.getMessage() + ")", e);
        }
    }
}
