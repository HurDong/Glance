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

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisService {

    private final KisProperties kisProperties;
    private final KisAccessTokenService tokenService;
    private final StockSymbolRepository stockSymbolRepository;
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
}
