package com.glance.domain.stocks.controller;

import com.glance.domain.stocks.service.RedisStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/redis")
@RequiredArgsConstructor
public class RedisStockController {

    private final RedisStockService redisStockService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("localSubscriptions", redisStockService.getLocalSubscriptionCounts());
        return ResponseEntity.ok(status);
    }

    @GetMapping("/status/{symbol}")
    public ResponseEntity<Map<String, Object>> getSymbolStatus(@PathVariable String symbol) {
        Map<String, Object> status = new HashMap<>();
        status.put("symbol", symbol);
        status.put("localCount", redisStockService.getLocalSubscriptionCounts().getOrDefault(symbol, 0));
        status.put("globalCount", redisStockService.getGlobalSubscriptionCount(symbol));
        return ResponseEntity.ok(status);
    }

    @PostMapping("/subscribe/{symbol}")
    public ResponseEntity<String> subscribeLocal(@PathVariable String symbol) {
        redisStockService.subscribeToChannel(symbol);
        return ResponseEntity.ok("Subscribed locally to " + symbol);
    }

    @PostMapping("/unsubscribe/{symbol}")
    public ResponseEntity<String> unsubscribeLocal(@PathVariable String symbol) {
        redisStockService.unsubscribeFromChannel(symbol);
        return ResponseEntity.ok("Unsubscribed locally from " + symbol);
    }

    // Note: Global subscription manipulation (RefCount) is usually done via
    // InterestStockService,
    // but could be exposed here if needed for debugging KIS connection logic.
}
