package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.config.KisProperties;
import com.glance.domain.stocks.dto.StockPriceMessage;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    private WebSocketSession session;
    private final Set<String> subscribedSymbols = ConcurrentHashMap.newKeySet();

    @EventListener(ApplicationReadyEvent.class)
    public void connect() {
        try {
            StandardWebSocketClient client = new StandardWebSocketClient();
            client.execute(this, kisProperties.getWsUrl()).get();
        } catch (Exception e) {
            log.error("Failed to connect to KIS WebSocket", e);
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        this.session = session;
        log.info("🚀 Connected to KIS WebSocket");
        // Re-subscribe if needed
        subscribedSymbols.forEach(this::sendSubscribeRequest);
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
            log.info("KIS WS Response: {}", payload);
            return;
        }

        try {
            // Data format: Encrypted/Plain | TR_ID | Count | Data (Pipe separated)
            String[] parts = payload.split("\\|");
            if (parts.length < 4)
                return;

            String trId = parts[1];
            if ("H0STCNT0".equals(trId)) { // 국내주식 실시간 체결
                parseAndBroadcastKorea(parts[3]);
            } else if ("HDFSASP0".equals(trId)) { // 해외주식 실시간 체결
                parseAndBroadcastUS(parts[3]);
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
        String price = fields[11];
        String change = fields[24];
        String changeRate = fields[25];
        String time = fields[1];

        broadcast(symbol, price, change, changeRate, time);
    }

    private void broadcast(String symbol, String price, String change, String changeRate, String time) {
        StockPriceMessage msg = StockPriceMessage.builder()
                .symbol(symbol)
                .price(price)
                .change(change)
                .changeRate(changeRate)
                .time(time)
                .build();

        messagingTemplate.convertAndSend("/api/v1/sub/stocks/" + symbol, msg);
        log.info("📡 Broadcasted: {} - {} ({}%)", symbol, price, changeRate);
    }

    public synchronized void subscribe(String symbol) {
        if (subscribedSymbols.contains(symbol))
            return;
        subscribedSymbols.add(symbol);
        if (session != null && session.isOpen()) {
            sendSubscribeRequest(symbol);
        }
    }

    private void sendSubscribeRequest(String symbol) {
        boolean isUS = symbol.matches("^[a-zA-Z].*");
        String trId = isUS ? "HDFSASP0" : "H0STCNT0";
        // KIS 미국 주식 규격: DNAS (주간/나스닥), DNYS (주간/뉴욕), DAMS (주간/아멕스)
        // 일단 DNAS가 신호를 주므로 DNAS로 고정
        String trKey = isUS ? "DNAS" + symbol : symbol;

        try {
            Map<String, Object> request = Map.of(
                    "header", Map.of(
                            "approval_key", tokenService.getApprovalKey(),
                            "custtype", "P",
                            "tr_type", "1", // 1: Subscribe, 2: Unsubscribe
                            "content-type", "utf-8"),
                    "body", Map.of(
                            "input", Map.of(
                                    "tr_id", trId,
                                    "tr_key", trKey)));
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(request)));
            log.info("📤 Requested {} subscription for: {}", isUS ? "US" : "KR", symbol);
        } catch (Exception e) {
            log.error("Failed to send subscription request", e);
        }
    }
}
