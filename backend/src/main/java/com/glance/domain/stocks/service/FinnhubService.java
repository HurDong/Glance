package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.dto.ChartDataResponse;
import com.glance.domain.stocks.dto.ChartDataResponse.ChartPoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class FinnhubService {

    @Value("${external.finnhub.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChartDataResponse getUsChartData(String symbol, String range) {
        try {
            // Determine resolution and time ranges based on the requested 'range' param
            String resolution;
            long now = Instant.now().getEpochSecond();
            long from;

            // Finnhub Supported resolutions: 1, 5, 15, 30, 60, D, W, M
            switch (range) {
                case "1m":
                    resolution = "1";
                    from = now - (24 * 60 * 60); // 1 day back for 1-minute
                    break;
                case "5m":
                    resolution = "5";
                    from = now - (3 * 24 * 60 * 60); // 3 days back for 5-minute
                    break;
                case "15m":
                    resolution = "15";
                    from = now - (7 * 24 * 60 * 60); // 7 days back for 15-minute
                    break;
                case "1h":
                    resolution = "60";
                    from = now - (14 * 24 * 60 * 60); // 14 days back for hourly
                    break;
                case "1d":
                    resolution = "D";
                    from = now - (60L * 24 * 60 * 60); // 2 months back for daily
                    break;
                case "1w":
                    resolution = "W";
                    from = now - (3L * 365 * 24 * 60 * 60); // 3 years back for weekly
                    break;
                case "1M":
                    resolution = "M";
                    from = now - (10L * 365 * 24 * 60 * 60); // 10 years back for monthly
                    break;
                case "1Y":
                    resolution = "M"; // Finnhub max resolution is M
                    from = now - (20L * 365 * 24 * 60 * 60); // 20 years back for yearly
                    break;
                default:
                    resolution = "D";
                    from = now - (30L * 24 * 60 * 60);
            }

            String url = String.format(
                    "https://finnhub.io/api/v1/stock/candle?symbol=%s&resolution=%s&from=%d&to=%d&token=%s",
                    symbol, resolution, from, now, apiKey);

            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);

            String status = root.path("s").asText();
            if (!"ok".equals(status)) {
                throw new RuntimeException("Finnhub API returned status: " + status);
            }

            JsonNode timestamps = root.path("t");
            JsonNode closePrices = root.path("c");
            JsonNode volumes = root.path("v");

            List<ChartPoint> points = new ArrayList<>();
            DateTimeFormatter dateFormatter;

            // For intraday (minutes/hours), we often want the full timestamp or HHmm format
            // For daily+, yyyyMMdd is fine. The frontend will parse it.
            // Since our DTO uses String date, let's output a consistent format that
            // frontend can handle
            boolean isIntraday = resolution.equals("1") || resolution.equals("5") || resolution.equals("15")
                    || resolution.equals("60");

            if (timestamps.isArray() && closePrices.isArray()) {
                // Finnhub returns oldest first, which is standard for charts normally,
                // But our existing KIS logic reversed it because KIS returns newest first.
                // Our frontend expects oldest first. Wait, let's check KIS logic again.
                // Finnhub is chronologically oldest -> newest.
                for (int i = 0; i < timestamps.size(); i++) {
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

                    points.add(ChartPoint.builder()
                            .date(dateStr)
                            .price(closePrices.get(i).asDouble())
                            .volume(volumes.get(i).asLong())
                            .build());
                }
            }

            return ChartDataResponse.builder()
                    .symbol(symbol)
                    .range(range)
                    .data(points)
                    .build();

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Finnhub HTTP Error for {}: {}", symbol, e.getStatusCode());
            if (e.getStatusCode().value() == 403) {
                throw new RuntimeException("해당 기간의 해외 주식 차트 데이터는 현재 API 권한(무료 티어)으로 인해 조회할 수 없습니다.", e);
            }
            throw new RuntimeException("해외 주식 차트 데이터를 불러올 수 없습니다. (" + e.getMessage() + ")", e);
        } catch (Exception e) {
            log.error("Error fetching US chart data from Finnhub for {}", symbol, e);
            throw new RuntimeException("해외 주식 차트 데이터를 불러올 수 없습니다. (" + e.getMessage() + ")", e);
        }
    }
}
