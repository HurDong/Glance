package com.glance.domain.stocks.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.stocks.service.KisWebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockPriceController {

    private final KisWebSocketService kisWebSocketService;
    private final com.glance.domain.stocks.service.RedisStockService redisStockService;

    @MessageMapping("/stocks/subscribe/{symbol}")
    public void handleSubscribe(@DestinationVariable String symbol) {
        // 1. Subscribe to Redis Channel (Local Instance) so we can broadcast to this
        // user
        redisStockService.subscribeToChannel(symbol);

        // 2. Increment Redis Reference Count
        redisStockService.subscribe(symbol);

        // 3. Always attempt to subscribe to KIS (Global)
        // Even if Redis count was > 0, our local KIS WebSocket might not be subscribed
        // yet (e.g. server restart)
        // KisWebSocketService.subscribe() has internal deduplication, so this is
        // safe/idempotent.
        kisWebSocketService.subscribe(symbol);
    }

    @PostMapping("/{symbol}/subscribe")
    public ApiResponse<Void> subscribe(@PathVariable String symbol) {
        redisStockService.subscribe(symbol);
        kisWebSocketService.subscribe(symbol);
        return ApiResponse.success(symbol + " 시세 구독이 요청되었습니다. WebSocket(/api/v1/sub/stocks/" + symbol + ")을 통해 수신됩니다.");
    }
}
