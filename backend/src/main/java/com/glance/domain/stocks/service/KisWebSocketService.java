package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.config.KisProperties;
import com.glance.domain.stocks.dto.StockPriceMessage;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisWebSocketService extends TextWebSocketHandler {

    private final KisProperties kisProperties;
    private final KisAccessTokenService tokenService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RedisStockService redisStockService; // Use Redis service instead of DB repo
    private final StockSymbolRepository stockSymbolRepository; // Look up market info
    private final ObjectMapper objectMapper = new ObjectMapper();

    private WebSocketSession session;
    private final Set<String> subscribedSymbols = ConcurrentHashMap.newKeySet();

    // Add heartbeat scheduler
    // Note: Requires @EnableScheduling in the application configuration
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000) // Send Ping every 60 seconds
    public void sendHeartbeat() {
        if (session != null && session.isOpen()) {
            try {
                // KIS often keeps alive with simple traffic.
                // Try sending text "PING" which is sometimes more checks compatible
                session.sendMessage(new TextMessage("PING"));
                log.debug("💓 Sent KIS Heartbeat (Text PING)");
            } catch (Exception e) {
                log.warn("Failed to send heartbeat to KIS", e);
            }
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void connect() {
        try {
            StandardWebSocketClient client = new StandardWebSocketClient();
            client.execute(this, kisProperties.getWsUrl()).get();
        } catch (Exception e) {
            log.error("Failed to connect to KIS WebSocket", e);
        }
    }

    // Allow external services to trigger re-subscription logic if needed
    public synchronized void resubscribeAll() {
        subscribedSymbols.forEach(s -> sendSubscribeRequest(s, true));
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        this.session = session;
        log.info("🚀 Connected to KIS WebSocket");

        // Re-subscribe any already in memory (redundant but safe)
        int count = subscribedSymbols.size();
        log.info("🔄 Re-subscribing to {} symbols...", count);
        subscribedSymbols.forEach(s -> sendSubscribeRequest(s, true));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.warn("❌ KIS WebSocket Closed: {}. Reconnecting...", status);
        this.session = null;
        connect();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        log.debug("RAW KIS MSG: {}", payload);

        if (payload.startsWith("{")) {
            log.debug("KIS WS Response: {}", payload);
            return;
        }

        try {
            // Data format: Encrypted/Plain | TR_ID | Count | Data (Pipe separated)
            String[] parts = payload.split("\\|");
            if (parts.length < 4) {
                log.warn("KIS WS Message too short: {}", payload);
                return;
            }

            String trId = parts[1];
            // log.info("KIS WS TR_ID: {}", trId); // Debugging line

            if ("H0STCNT0".equals(trId)) { // 국내주식 실시간 체결
                parseAndBroadcastKorea(parts[3]);
            } else if ("HDFSASP0".equals(trId) || "HDFSCNT0".equals(trId)) { // 해외주식 실시간 호가 or 체결
                parseAndBroadcastUS(parts[3]);
            } else {
                log.warn("Unknown TR_ID: {}", trId);
            }
        } catch (Exception e) {
            log.error("Failed to parse KIS message", e);
        }
    }

    private void parseAndBroadcastKorea(String data) {
        String[] fields = data.split("\\^");
        if (fields.length < 6)
            return;

        String symbol = fields[0];
        String price = fields[2];
        String change = fields[4];
        String changeRate = fields[5];
        String time = fields[1];

        broadcast(symbol, price, change, changeRate, time);
    }

    private void parseAndBroadcastUS(String data) {
        log.debug("RAW US DATA: {}", data);
        String[] fields = data.split("\\^");
        if (fields.length < 26)
            return;

        String symbol = fields[0];
        // Remove market prefix (DNAS, DNYS, DAMS)
        if (symbol.length() > 4) {
            symbol = symbol.substring(4);
        }

        try {
            String price = fields[11];
            String sign = fields[12];
            String change = fields[13];
            String changeRate = fields[14];
            String time = fields[1];

            // Apply direction to change value based on sign (1:Upper, 2:Up, 3:Steady,
            // 4:Down, 5:Lower)
            if ("4".equals(sign) || "5".equals(sign)) {
                change = "-" + change;
            }

            broadcast(symbol, price, change, changeRate, time);
        } catch (Exception e) {
            log.error("Failed to parse pricing data for {}", symbol);
        }
    }

    private void broadcast(String symbol, String price, String change, String changeRate, String time) {
        StockPriceMessage msg = StockPriceMessage.builder()
                .symbol(symbol)
                .price(price)
                .change(change)
                .changeRate(changeRate)
                .time(time)
                .build();

        redisStockService.publish(symbol, msg);
        log.debug("📡 Published to Redis: {} - {} ({}%)", symbol, price, changeRate);
    }

    public synchronized void subscribe(String symbol) {
        if (subscribedSymbols.contains(symbol))
            return;
        subscribedSymbols.add(symbol);
        if (session != null && session.isOpen()) {
            sendSubscribeRequest(symbol, true);
        }
    }

    public synchronized void unsubscribe(String symbol) {
        if (!subscribedSymbols.contains(symbol))
            return;
        subscribedSymbols.remove(symbol);
        if (session != null && session.isOpen()) {
            sendSubscribeRequest(symbol, false);
        }
    }

    private synchronized void sendSubscribeRequest(String symbol, boolean subscribe) {
        boolean isUS = symbol.matches("^[a-zA-Z].*");
        String trId = isUS ? "HDFSCNT0" : "H0STCNT0";
        String trKey = symbol;

        if (isUS) {
            String marketCode = "DNAS"; // Default to NASDAQ
            try {
                var stockSymbol = stockSymbolRepository.findBySymbol(symbol);
                if (stockSymbol.isPresent()) {
                    switch (stockSymbol.get().getMarket()) {
                        case NYSE:
                            marketCode = "DNYS";
                            break;
                        case AMEX:
                            marketCode = "DAMS";
                            break;
                        default:
                            marketCode = "DNAS";
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to lookup market for symbol: {}, using default DNAS", symbol);
            }
            trKey = marketCode + symbol;
        }

        try {
            Map<String, Object> request = Map.of(
                    "header", Map.of(
                            "approval_key", tokenService.getApprovalKey(),
                            "custtype", "P",
                            "tr_type", subscribe ? "1" : "2", // 1: Subscribe, 2: Unsubscribe
                            "content-type", "utf-8"),
                    "body", Map.of(
                            "input", Map.of(
                                    "tr_id", trId,
                                    "tr_key", trKey)));
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(request)));
            log.info("{} Requested {} subscription for: {} (TR_ID: {}, TR_KEY: {})",
                    subscribe ? "📤" : "🗑️",
                    isUS ? "US" : "KR", symbol, trId, trKey);
        } catch (Exception e) {
            log.error("Failed to send subscription request", e);
        }
    }
}
