package com.glance.domain.stocks.service;

import com.glance.domain.stocks.config.KisProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.TimeUnit;

@SpringBootTest
@ActiveProfiles("kis")
class WebSocketManualVerificationTest {

    @Autowired
    private KisWebSocketService kisWebSocketService;

    @Test
    void verifyWebSocketRealTime() throws InterruptedException {
        System.out.println("--- Starting WebSocket Verification (Time: " + java.time.LocalDateTime.now() + ") ---");

        // 미국 주식 애플(AAPL) 구독 요청
        String symbol = "AAPL";
        kisWebSocketService.subscribe(symbol);

        System.out.println("Subscribed to " + symbol + ". Waiting for 30 seconds to capture real-time US data...");

        // 30초간 대기하며 실시간 시세 로그가 찍히는지 확인
        TimeUnit.SECONDS.sleep(30);

        System.out.println("--- Verification Period Ended ---");
    }
}
