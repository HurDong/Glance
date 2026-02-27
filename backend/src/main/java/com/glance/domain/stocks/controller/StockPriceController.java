package com.glance.domain.stocks.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.stocks.service.KisWebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.glance.domain.stocks.dto.StockPriceMessage;
import com.glance.domain.stocks.service.KisService;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockPriceController {

    private final KisWebSocketService kisWebSocketService;
    private final com.glance.domain.stocks.service.RedisStockService redisStockService;
    private final KisService kisService;

    @GetMapping("/{symbol}/price")
    public ApiResponse<?> getCurrentPrice(@PathVariable String symbol) {
        StockPriceMessage message = kisService.getCurrentPrice(symbol);
        if (message != null) {
            return ApiResponse.success(message);
        }
        return ApiResponse.fail("Failed to fetch current price for " + symbol);
    }

    @GetMapping("/{symbol}/chart")
    public ApiResponse<?> getChartData(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1M") String range) {
        try {
            var data = kisService.getChartData(symbol, range);
            if (data != null) {
                return ApiResponse.success(data);
            }
            return ApiResponse.fail("Failed to fetch chart data for " + symbol);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

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
