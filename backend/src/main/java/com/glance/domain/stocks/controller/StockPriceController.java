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

    @MessageMapping("/stocks/subscribe/{symbol}")
    public void handleSubscribe(@DestinationVariable String symbol) {
        kisWebSocketService.subscribe(symbol);
    }

    @PostMapping("/{symbol}/subscribe")
    public ApiResponse<Void> subscribe(@PathVariable String symbol) {
        kisWebSocketService.subscribe(symbol);
        return ApiResponse.success(symbol + " 시세 구독이 요청되었습니다. WebSocket(/api/v1/sub/stocks/" + symbol + ")을 통해 수신됩니다.");
    }
}
