package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.dto.ChartDataResponse;
import com.glance.domain.stocks.dto.ChartDataResponse.ChartPoint;
import com.glance.domain.stocks.dto.StockPriceMessage;
import java.time.LocalTime;
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
public class FinnhubService { // Re-using the class name to maintain Dependency Injection without extra
                              // changes

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChartDataResponse getUsChartData(String symbol, String range) {
        String yahooSymbol = symbol;
        if ("OANDA:USD_KRW".equals(symbol)) {
            yahooSymbol = "KRW=X";
        } else if (symbol.startsWith("BINANCE:")) {
            // Convert 'BINANCE:BTCUSDT' to 'BTC-USD' for Yahoo Finance
            String coin = symbol.replace("BINANCE:", "");
            if (coin.endsWith("USDT")) {
                yahooSymbol = coin.substring(0, coin.length() - 4) + "-USD";
            } else if (coin.endsWith("USD")) {
                yahooSymbol = coin.substring(0, coin.length() - 3) + "-USD";
            }
        }

        try {
            // Mapping frontend ranges to Yahoo Finance ranges and intervals
            String interval;
            String yfRange;

            switch (range) {
                case "1m":
                case "5m":
                case "15m":
                    yfRange = "7d"; // Unified range for all short-term intraday
                    interval = range;
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
                    yahooSymbol, yfRange, interval);

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
            
            // Get the very latest price from meta to append as the last point
            JsonNode meta = result.path("meta");
            double currentPrice = meta.path("regularMarketPrice").asDouble();
            long currentPriceTs = meta.path("regularMarketTime").asLong();

            List<ChartPoint> points = new ArrayList<>();
            boolean isIntraday = interval.endsWith("m");
            long lastTs = 0;

            if (timestamps != null && timestamps.isArray() && closePrices != null && closePrices.isArray()) {
                for (int i = 0; i < timestamps.size(); i++) {
                    if (closePrices.get(i).isNull())
                        continue; 

                    long ts = timestamps.get(i).asLong();
                    lastTs = ts;
                    Instant instant = Instant.ofEpochSecond(ts);
                    String dateStr;

                    if (isIntraday) {
                        dateStr = DateTimeFormatter.ofPattern("yyyyMMddHHmm")
                                .withZone(ZoneId.of("Asia/Seoul"))
                                .format(instant);
                    } else {
                        dateStr = DateTimeFormatter.ofPattern("yyyyMMdd")
                                .withZone(ZoneId.of("Asia/Seoul"))
                                .format(instant);
                    }

                    long volume = volumes != null && volumes.has(i) && !volumes.get(i).isNull()
                            ? volumes.get(i).asLong()
                            : 0L;
                    points.add(ChartPoint.builder()
                            .date(dateStr)
                            .price(closePrices.get(i).asDouble())
                            .volume(volume)
                            .build());
                }
            }
            
            // Append or update the real-time price to ensure all intervals show the same current price
            if (currentPrice > 0) {
                String dateStr = isIntraday 
                    ? DateTimeFormatter.ofPattern("yyyyMMddHHmm").withZone(ZoneId.of("Asia/Seoul")).format(Instant.ofEpochSecond(currentPriceTs))
                    : DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneId.of("Asia/Seoul")).format(Instant.ofEpochSecond(currentPriceTs));

                if (currentPriceTs > lastTs) {
                    // Append as a new point if it's newer
                    points.add(ChartPoint.builder()
                            .date(dateStr)
                            .price(currentPrice)
                            .volume(0L)
                            .build());
                } else if (!points.isEmpty()) {
                    // CRITICAL: Update the price of the very last point to match real-time price
                    // This ensures 1m, 5m, 15m all end with the exact same price value.
                    ChartPoint lastPoint = points.get(points.size() - 1);
                    lastPoint.setPrice(currentPrice);
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

    /**
     * Yahoo Finance에서 해외주식 현재가를 조회합니다.
     * KIS WebSocket/REST가 공휴일 등으로 데이터를 제공하지 않을 때 폴백으로 사용됩니다.
     */
    public StockPriceMessage getUSCurrentPrice(String symbol) {
        try {
            String url = String.format(
                    "https://query1.finance.yahoo.com/v8/finance/chart/%s?range=1d&interval=1m&includePrePost=true",
                    symbol);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode meta = root.path("chart").path("result").get(0).path("meta");

            if (meta == null || meta.isMissingNode()) {
                log.warn("[Yahoo Fallback] No meta for {}", symbol);
                return null;
            }

            String price = meta.path("regularMarketPrice").asText();
            String prevClose = meta.path("chartPreviousClose").asText();
            String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HHmmss"));

            double priceVal = Double.parseDouble(price);
            double prevCloseVal = Double.parseDouble(prevClose);
            double change = priceVal - prevCloseVal;
            double changeRate = prevCloseVal != 0 ? (change / prevCloseVal) * 100 : 0;

            log.info("[Yahoo Fallback] {} price={} change={} rate={}%", symbol, price,
                    String.format("%.4f", change), String.format("%.2f", changeRate));

            return StockPriceMessage.builder()
                    .symbol(symbol)
                    .price(price)
                    .change(String.format("%.4f", change))
                    .changeRate(String.format("%.2f", changeRate))
                    .time(time)
                    .build();

        } catch (Exception e) {
            log.error("[Yahoo Fallback] Error fetching price for {}: {}", symbol, e.getMessage());
            return null;
        }
    }
}
