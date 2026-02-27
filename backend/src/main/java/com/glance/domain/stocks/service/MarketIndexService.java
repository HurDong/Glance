package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.dto.MarketIndexDto;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketIndexService {

    private final Map<String, MarketIndexDto> cache = new ConcurrentHashMap<>();

    @Value("${external.finnhub.api-key:demo}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @PostConstruct
    public void init() {
        log.info("Initializing MarketIndexService...");
        // Initial population of the cache
        refreshAllIndices();
        refreshCrypto(); // Also call crypto refresh for initial population
        log.info("MarketIndexService initialized. Cache size: {}", cache.size());
    }

    // Standard Indices: 10 minutes (600,000 ms)
    @Scheduled(fixedRate = 600000)
    public void refreshAllIndices() {
        log.info("Executing refreshAllIndices... Current Key: {}",
                (apiKey == null || "demo".equals(apiKey)) ? "DEMO/NULL"
                        : "PRESENT (" + apiKey.substring(0, 4) + "...)");

        if (apiKey == null || "demo".equals(apiKey)) {
            log.warn("Finnhub API Key is missing or demo. Skipping refreshAllIndices.");
            // If cache is empty, populate with mock data
            if (cache.isEmpty()) {
                getMockIndices().forEach(dto -> cache.put(dto.getSymbol(), dto));
                log.info("Cache populated with mock data due to missing API key.");
            }
            return;
        }

        String[] symbols = { "SPY", "QQQ", "EWY", "GLD", "OANDA:USD_KRW" };
        log.info("Fetching Standard Indices: {}", Arrays.toString(symbols));

        for (String symbol : symbols) {
            fetchAndCache(symbol);
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Thread interrupted during rate limiting sleep.", e);
            }
        }
        log.info("Standard indices refreshed. Current cache size: {}", cache.size());
    }

    // Crypto (BTC): 1 minute (60,000 ms) - Faster updates
    @Scheduled(fixedRate = 60000)
    public void refreshCrypto() {
        log.info("Executing refreshCrypto... Current Key: {}", (apiKey == null || "demo".equals(apiKey)) ? "DEMO/NULL"
                : "PRESENT (" + apiKey.substring(0, 4) + "...)");

        if (apiKey == null || "demo".equals(apiKey)) {
            log.warn("Finnhub API Key is missing or demo. Skipping refreshCrypto.");
            // If cache is empty, populate with mock data
            if (cache.isEmpty()) {
                getMockIndices().forEach(dto -> cache.put(dto.getSymbol(), dto));
                log.info("Cache populated with mock data due to missing API key.");
            }
            return;
        }

        String symbol = "BINANCE:BTCUSDT";
        log.info("Fetching Crypto: {}", symbol);
        fetchAndCache(symbol);
        log.info("Crypto index refreshed. Current cache size: {}", cache.size());
    }

    private void fetchAndCache(String symbol) {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;

            log.debug("Requesting Finnhub URL for {}: {}", symbol, url.replace(apiKey, "HIDDEN_KEY"));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode node = objectMapper.readTree(response.body());
                // Validate data presence (Finnhub returns {c:0, ...} if invalid usually, or all
                // nulls)
                if (node.has("c") && !node.path("c").isNull() && node.path("c").asDouble() != 0) {
                    MarketIndexDto dto = mapFinnhubToDto(symbol, node);
                    cache.put(symbol, dto);
                    log.debug("Successfully fetched and cached {}: {}", symbol, dto);
                } else {
                    log.warn("Finnhub No Data for {}: {}", symbol, response.body());
                }
            } else {
                log.error("Finnhub Error for {}: Status {}", symbol, response.statusCode());
                log.error("Finnhub Error Body for {}: {}", symbol, response.body());
            }
        } catch (Exception e) {
            log.error("Failed to fetch {} from Finnhub", symbol, e);
        }
    }

    public List<MarketIndexDto> getIndices() {
        if (cache.isEmpty()) {
            log.warn("Cache is empty, returning mock indices.");
            return getMockIndices();
        }

        // Return in specific order
        List<String> order = List.of("SPY", "QQQ", "EWY", "GLD", "BINANCE:BTCUSDT", "OANDA:USD_KRW");
        List<MarketIndexDto> sortedList = new ArrayList<>();

        for (String s : order) {
            if (cache.containsKey(s)) {
                sortedList.add(cache.get(s));
            }
        }
        // If some items are missing from the cache but present in order,
        // or if there are items in cache not in order, they won't be included.
        // For this use case, we assume 'order' is the definitive list.
        return sortedList;
    }

    private MarketIndexDto mapFinnhubToDto(String symbol, JsonNode node) {
        double price = node.path("c").asDouble(); // Current price
        double change = node.path("d").asDouble(); // Change
        double changePercent = node.path("dp").asDouble(); // Percent change

        String type = determineType(symbol);
        String name = formatName(symbol);

        return MarketIndexDto.builder()
                .symbol(symbol)
                .name(name)
                .price(formatPrice(price, type))
                .change((change > 0 ? "+" : "") + String.format("%.2f", change))
                .changePercent((changePercent > 0 ? "+" : "") + String.format("%.2f", changePercent))
                .type(type)
                .build();
    }

    private String determineType(String symbol) {
        if (symbol.equals("SPY") || symbol.equals("QQQ"))
            return "US";
        if (symbol.equals("EWY"))
            return "KR";
        if (symbol.contains("BTC"))
            return "CRYPTO";
        if (symbol.contains("GLD"))
            return "COMMODITY";
        if (symbol.contains("USD_KRW"))
            return "FOREX";
        return "US";
    }

    private String formatName(String symbol) {
        switch (symbol) {
            case "SPY":
                return "S&P 500 (ETF)";
            case "QQQ":
                return "NASDAQ (ETF)";
            case "EWY":
                return "KOSPI (ETF)";
            case "GLD":
                return "금 (ETF)";
            case "BINANCE:BTCUSDT":
                return "비트코인";
            case "OANDA:USD_KRW":
                return "원/달러 환율";
            default:
                return symbol;
        }
    }

    private String formatPrice(double price, String type) {
        return String.format("%,.2f", price);
    }

    private List<MarketIndexDto> getMockIndices() {
        return List.of(
                new MarketIndexDto("SPY", "S&P 500", "5,088.80", "+25.61", "+0.51", "US"),
                new MarketIndexDto("QQQ", "NASDAQ", "17,962.40", "+113.09", "+0.71", "US"),
                new MarketIndexDto("EWY", "KOSPI (ETF)", "62.40", "+0.50", "+0.81", "KR"),
                new MarketIndexDto("GLD", "금 (ETF)", "188.50", "+1.20", "+0.52", "COMMODITY"),
                new MarketIndexDto("BINANCE:BTCUSDT", "비트코인", "51,850.00", "+1,240.00", "+2.45", "CRYPTO"),
                new MarketIndexDto("OANDA:USD_KRW", "원/달러 환율", "1,350.50", "-5.20", "-0.38", "FOREX"));
    }
}
