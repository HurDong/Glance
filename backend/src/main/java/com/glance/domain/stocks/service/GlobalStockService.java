package com.glance.domain.stocks.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GlobalStockService {

    private final RedisStockService redisStockService;
    private final KisWebSocketService kisWebSocketService;

    // Major Stock Lists (Synchronized with Frontend)
    private static final List<String> POPULAR_STOCKS = List.of(
            // KR
            "005930", "000660", "035420", "035720", "005380", "051910", "000270",
            // US
            "NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "AMD");

    @EventListener(ApplicationReadyEvent.class)
    public void initGlobalSubscriptions() {
        log.info("🌍 Initializing Global Stock Subscriptions for Public Ticker...");

        for (String symbol : POPULAR_STOCKS) {
            // 1. Subscribe to Redis Channel (Local Instance)
            redisStockService.subscribeToChannel(symbol);

            // 2. Increment Global RefCount & Subscribe to KIS
            // We treat this as a "system" subscription that persists
            if (redisStockService.subscribe(symbol)) {
                kisWebSocketService.subscribe(symbol);
            }
        }

        log.info("✅ Subscribed to {} global stocks", POPULAR_STOCKS.size());

        // Wait for WebSocket connection to be established then resubscribe
        // This is a simple workaround to ensure KIS subscriptions go through
        new Thread(() -> {
            try {
                Thread.sleep(5000); // Wait 5 seconds
                kisWebSocketService.resubscribeAll();
                log.info("🔄 Resent global subscriptions to KIS");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}
