package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.config.KisProperties;
import com.glance.domain.stocks.dto.StockPriceMessage;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.glance.domain.stocks.dto.ChartDataResponse;
import com.glance.domain.stocks.dto.ChartDataResponse.ChartPoint;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisService {

    private final KisProperties kisProperties;
    private final KisAccessTokenService tokenService;
    private final StockSymbolRepository stockSymbolRepository;
    private final FinnhubService finnhubService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StockPriceMessage getCurrentPrice(String symbol) {
        if (symbol == null || symbol.isEmpty())
            return null;

        boolean isUS = symbol.matches("^[a-zA-Z].*");
        if (isUS) {
            return getUSCurrentPrice(symbol);
        } else {
            return getKoreaCurrentPrice(symbol);
        }
    }

    public ChartDataResponse getChartData(String symbol, String range) {
        if (symbol == null || symbol.isEmpty())
            return null;

        boolean isUS = symbol.matches("^[a-zA-Z].*");
        if (isUS) {
            return finnhubService.getUsChartData(symbol, range);
        } else {
            return getKoreaChartData(symbol, range);
        }
    }

    private StockPriceMessage getKoreaCurrentPrice(String symbol) {
        try {
            String url = kisProperties.getUrl() + "/uapi/domestic-stock/v1/quotations/inquire-price";

            HttpHeaders headers = new HttpHeaders();
            headers.set("content-type", "application/json; charset=utf-8");
            headers.set("authorization", "Bearer " + tokenService.getAccessToken());
            headers.set("appkey", kisProperties.getAppKey());
            headers.set("appsecret", kisProperties.getAppSecret());
            headers.set("tr_id", "FHKST01010100");

            String queryUrl = String.format("%s?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=%s", url, symbol);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode output = root.path("output");

            if (output.isMissingNode()) {
                log.warn("Failed to fetch KR price for {}: {}", symbol, response.getBody());
                return null;
            }

            String price = output.path("stck_prpr").asText(); // Current Price
            String change = output.path("prdy_vrss").asText(); // Change
            String changeRate = output.path("prdy_ctrt").asText(); // Change Rate
            // Time is not explicitly in this API output usually, so we use current time or
            // ignore
            String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HHmmss"));

            return StockPriceMessage.builder()
                    .symbol(symbol)
                    .price(price)
                    .change(change)
                    .changeRate(changeRate)
                    .time(time)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching KR price for {}", symbol, e);
            return null;
        }
    }

    private StockPriceMessage getUSCurrentPrice(String symbol) {
        try {
            // Determine Market Code (NAS/NYS/AMS)
            String marketCode = "NAS"; // Default
            var stockSymbol = stockSymbolRepository.findBySymbol(symbol);
            if (stockSymbol.isPresent()) {
                switch (stockSymbol.get().getMarket()) {
                    case NYSE:
                        marketCode = "NYS";
                        break;
                    case AMEX:
                        marketCode = "AMS";
                        break;
                    default:
                        marketCode = "NAS";
                }
            }

            String url = kisProperties.getUrl() + "/uapi/overseas-price/v1/quotations/price";

            HttpHeaders headers = new HttpHeaders();
            headers.set("content-type", "application/json; charset=utf-8");
            headers.set("authorization", "Bearer " + tokenService.getAccessToken());
            headers.set("appkey", kisProperties.getAppKey());
            headers.set("appsecret", kisProperties.getAppSecret());
            headers.set("tr_id", "HHDFS00000300"); // Overseas Price Detail

            String queryUrl = String.format("%s?AUTH=&EXCD=%s&SYMB=%s", url, marketCode, symbol);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode output = root.path("output");

            if (output.isMissingNode()) {
                log.warn("Failed to fetch US price for {}: {}", symbol, response.getBody());
                return null;
            }

            String price = output.path("last").asText(); // Last Price
            String change = output.path("diff").asText(); // Change
            String changeRate = output.path("rate").asText(); // Rate
            String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HHmmss"));

            // Check if sign is negative based on logic if not provided directly
            // Usually 'diff' has sign or we check 'sign' field if available.
            // For this API, let's assume raw values are correct or adjust if needed.

            return StockPriceMessage.builder()
                    .symbol(symbol)
                    .price(price)
                    .change(change)
                    .changeRate(changeRate)
                    .time(time)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching US price for {}", symbol, e);
            return null;
        }
    }

    private ChartDataResponse getKoreaChartData(String symbol, String range) {
        try {
            boolean isIntraday = range.endsWith("m") || range.endsWith("h");

            if (isIntraday) {
                return getKoreaIntradayChartData(symbol, range);
            } else {
                return getKoreaPeriodicChartData(symbol, range);
            }

        } catch (Exception e) {
            log.error("Error fetching KR chart data for {}", symbol, e);
            throw new RuntimeException("국내 주식 차트 데이터를 불러올 수 없습니다. (" + e.getMessage() + ")", e);
        }
    }

    private ChartDataResponse getKoreaPeriodicChartData(String symbol, String range) throws Exception {
        String url = kisProperties.getUrl() + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice";

        int daysToSubtract = 30;
        String periodCode = "D"; // D: 일, W: 주, M: 월, Y: 년

        switch (range) {
            case "1d":
                daysToSubtract = 60; // Fetch 2 months of daily data
                periodCode = "D";
                break;
            case "1w":
                daysToSubtract = 365 * 3; // Fetch 3 years of weekly data
                periodCode = "W";
                break;
            case "1M":
                daysToSubtract = 365 * 10; // Fetch 10 years of monthly data
                periodCode = "M";
                break;
            case "1Y":
                daysToSubtract = 365 * 20; // Fetch 20 years of yearly data
                periodCode = "Y";
                break;
            default:
                daysToSubtract = 30;
                periodCode = "D";
        }

        String endDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String startDate = LocalDate.now().minusDays(daysToSubtract).format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        HttpHeaders headers = new HttpHeaders();
        headers.set("content-type", "application/json; charset=utf-8");
        headers.set("authorization", "Bearer " + tokenService.getAccessToken());
        headers.set("appkey", kisProperties.getAppKey());
        headers.set("appsecret", kisProperties.getAppSecret());
        headers.set("tr_id", "FHKST03010100");

        String queryUrl = String.format(
                "%s?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=%s&FID_INPUT_DATE_1=%s&FID_INPUT_DATE_2=%s&FID_PERIOD_DIV_CODE=%s&FID_ORG_ADJ_PRC=1",
                url, symbol, startDate, endDate, periodCode);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode output2 = root.path("output2");

        List<ChartPoint> points = new ArrayList<>();
        if (output2 != null && output2.isArray()) {
            for (JsonNode node : output2) {
                if (node.path("stck_clpr").asText().isEmpty())
                    continue;
                points.add(ChartPoint.builder()
                        .date(node.path("stck_bsop_date").asText())
                        .price(node.path("stck_clpr").asDouble())
                        .volume(node.path("acml_vol").asLong())
                        .build());
            }
        }

        Collections.reverse(points);

        return ChartDataResponse.builder()
                .symbol(symbol)
                .range(range)
                .data(points)
                .build();
    }

    private ChartDataResponse getKoreaIntradayChartData(String symbol, String range) throws Exception {
        String url = kisProperties.getUrl() + "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice";

        // inquire-time-itemchartprice uses time in HHMMSS, fetches data ending at the
        // requested time
        LocalTime now = LocalTime.now();
        LocalTime marketOpen = LocalTime.of(9, 0);
        LocalTime marketClose = LocalTime.of(15, 30);

        String currentTime;
        if (now.isBefore(marketOpen) || now.isAfter(marketClose)) {
            currentTime = "153000"; // Fetch up to market close if outside trading hours
        } else {
            currentTime = now.format(DateTimeFormatter.ofPattern("HHmmss"));
        }

        String todayDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        HttpHeaders headers = new HttpHeaders();
        headers.set("content-type", "application/json; charset=utf-8");
        headers.set("authorization", "Bearer " + tokenService.getAccessToken());
        headers.set("appkey", kisProperties.getAppKey());
        headers.set("appsecret", kisProperties.getAppSecret());
        headers.set("tr_id", "FHKST03010200");

        List<ChartPoint> points = new ArrayList<>();
        java.util.Set<String> seenTimes = new java.util.HashSet<>();

        for (int i = 0; i < 13; i++) { // Max 13 requests * 30 mins = 390 mins (1 full trading day)
            String queryUrl = String.format(
                    "%s?FID_ETC_CLS_CODE=&FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=%s&FID_INPUT_HOUR_1=%s&FID_PW_DATA_INCU_YN=N",
                    url, symbol, currentTime);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode output2 = root.path("output2"); // Contains time-series data

            if (output2 == null || !output2.isArray() || output2.isEmpty()) {
                break;
            }

            String lastTimeStr = null;
            for (JsonNode node : output2) {
                if (node.path("stck_prpr").asText().isEmpty())
                    continue;

                String timeStr = node.path("stck_cntg_hour").asText(); // HHmmss
                lastTimeStr = timeStr;

                if (seenTimes.contains(timeStr))
                    continue;
                seenTimes.add(timeStr);

                String datetimeStr = todayDate + timeStr; // For frontend formatting
                points.add(ChartPoint.builder()
                        .date(datetimeStr) // e.g. 20240301143000
                        .price(node.path("stck_prpr").asDouble())
                        .volume(node.path("cntg_vol").asLong())
                        .build());
            }

            if (lastTimeStr == null || lastTimeStr.compareTo("090000") <= 0) {
                break; // Reached market open or no data
            }

            try {
                // Determine next query time (subtract 1 minute from oldest time seen)
                LocalTime lastTimeObj = LocalTime.parse(lastTimeStr, DateTimeFormatter.ofPattern("HHmmss"));
                currentTime = lastTimeObj.minusMinutes(1).format(DateTimeFormatter.ofPattern("HHmmss"));
                Thread.sleep(50); // Pause briefly to prevent rate limits from API
            } catch (Exception ex) {
                break; // Parsing error, stop looping
            }
        }

        Collections.reverse(points); // Oldest to newest
        List<ChartPoint> aggregatedPoints = aggregateIntradayPoints(points, range);

        return ChartDataResponse.builder()
                .symbol(symbol)
                .range(range)
                .data(aggregatedPoints)
                .build();
    }

    private List<ChartPoint> aggregateIntradayPoints(List<ChartPoint> points, String range) {
        if ("1m".equals(range) || points.isEmpty()) {
            return points;
        }

        int intervalMinutes;
        switch (range) {
            case "5m":
                intervalMinutes = 5;
                break;
            case "15m":
                intervalMinutes = 15;
                break;
            case "1h":
                intervalMinutes = 60;
                break;
            default:
                return points;
        }

        List<ChartPoint> result = new ArrayList<>();
        ChartPoint currentAggregated = null;
        String currentAggregatedDateLabel = null;
        long aggregatedVolume = 0;

        for (ChartPoint pt : points) {
            // pt.date format is yyyyMMddHHmmss
            if (pt.getDate().length() < 14)
                continue;

            String hhStr = pt.getDate().substring(8, 10);
            String mmStr = pt.getDate().substring(10, 12);
            int hh = Integer.parseInt(hhStr);
            int mm = Integer.parseInt(mmStr);

            // Calculate the bucket minute
            int bucketMm = (mm / intervalMinutes) * intervalMinutes;
            String bucketDateLabel = String.format("%s%02d%02d00", pt.getDate().substring(0, 8), hh, bucketMm);

            if (currentAggregatedDateLabel == null || !currentAggregatedDateLabel.equals(bucketDateLabel)) {
                if (currentAggregated != null) {
                    currentAggregated.setVolume(aggregatedVolume);
                    result.add(currentAggregated);
                }
                currentAggregatedDateLabel = bucketDateLabel;
                aggregatedVolume = pt.getVolume();
                // Start a new bucket. We use the closing price of the bucket (the last point in
                // the bucket).
                // Since points are oldest -> newest, the last point we see in the bucket is the
                // close price.
                currentAggregated = ChartPoint.builder()
                        .date(bucketDateLabel)
                        .price(pt.getPrice())
                        .volume(0L) // Set later
                        .build();
            } else {
                aggregatedVolume += pt.getVolume();
                // Update the closing price to the latest point in this bucket
                currentAggregated.setPrice(pt.getPrice());
            }
        }

        if (currentAggregated != null) {
            currentAggregated.setVolume(aggregatedVolume);
            result.add(currentAggregated);
        }

        return result;
    }
}
