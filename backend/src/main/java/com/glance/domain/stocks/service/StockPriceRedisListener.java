package com.glance.domain.stocks.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.stocks.dto.StockPriceMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceRedisListener implements MessageListener {

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel());
            StockPriceMessage stockMessage = objectMapper.readValue(message.getBody(), StockPriceMessage.class);
            String symbol = stockMessage.symbol();

            // Broadcast to WebSocket
            // Channel format from Redis: stock.price.{symbol}
            // WebSocket Destination: /api/v1/sub/stocks/{symbol}

            String destination = "/api/v1/sub/stocks/" + symbol;
            messagingTemplate.convertAndSend(destination, stockMessage);

            // log.debug("Redis -> WS: {} @ {}", symbol, stockMessage.getPrice());

        } catch (IOException e) {
            log.error("Failed to process Redis message", e);
        }
    }
}
