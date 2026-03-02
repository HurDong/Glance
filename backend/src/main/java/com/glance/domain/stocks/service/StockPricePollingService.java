package com.glance.domain.stocks.service;

import com.glance.domain.stocks.dto.StockPriceMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * KIS WebSocket이 데이터를 보내지 않을 때(공휴일, 장외 시간 등)
 * 해외주식(미국) 현재가를 Yahoo Finance REST API로 주기적으로 폴링하여
 * Redis → STOMP로 브로드캐스트하는 스케줄러입니다.
 *
 * 폴백 조건: 구독된 해외주식 심볼에 대해 마지막 KIS WS 수신 후 30초 이상 무수신
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StockPricePollingService {

    private final KisWebSocketService kisWebSocketService;
    private final KisService kisService;
    private final RedisStockService redisStockService;

    // 폴링 대상 해외주식 심볼 목록 (KisWebSocketService의 subscribedSymbols 중 US만 필터링)
    private final Set<String> pollingSymbols = ConcurrentHashMap.newKeySet();

    private static final Duration FALLBACK_THRESHOLD = Duration.ofSeconds(30);

    /**
     * 외부에서 폴링 대상 심볼을 등록합니다 (해외주식 구독 시 호출).
     */
    public void registerUssSymbol(String symbol) {
        // 영문자로만 이루어진 심볼 = 해외주식
        if (symbol != null && symbol.matches("^[a-zA-Z].*")) {
            pollingSymbols.add(symbol.toUpperCase());
        }
    }

    public void unregisterSymbol(String symbol) {
        pollingSymbols.remove(symbol != null ? symbol.toUpperCase() : null);
    }

    /**
     * 20초마다 실행: KIS WS 수신이 30초 이상 없는 해외주식을 Yahoo Finance로 폴링
     */
    @Scheduled(fixedRate = 20000)
    public void pollFallbackPrices() {
        if (pollingSymbols.isEmpty())
            return;

        Instant threshold = Instant.now().minus(FALLBACK_THRESHOLD);

        for (String symbol : pollingSymbols) {
            Instant last = kisWebSocketService.getLastReceivedTime(symbol);
            if (last.isBefore(threshold)) {
                // KIS WS 30초 이상 무수신 → 폴백 조회
                try {
                    StockPriceMessage msg = kisService.getCurrentPrice(symbol);
                    if (msg != null) {
                        redisStockService.publish(symbol, msg);
                        log.debug("[Polling Fallback] {} price={} rate={}%", symbol, msg.price(), msg.changeRate());
                    }
                } catch (Exception e) {
                    log.warn("[Polling Fallback] Failed for {}: {}", symbol, e.getMessage());
                }
            }
        }
    }
}
