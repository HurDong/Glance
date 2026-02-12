package com.glance.domain.stocks.service;

import com.glance.domain.stocks.entity.InterestStock;
import com.glance.domain.stocks.repository.InterestStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final RedisStockService redisStockService;
    private final KisWebSocketService kisWebSocketService;
    private final InterestStockRepository interestStockRepository;
    private final KisService kisService;
    private final SimpMessagingTemplate messagingTemplate;

    // Using a repository to look up Member ID from email (Principal name)
    // Assuming Principal name is Member ID (as per recent fix) or Email?
    // Based on previous conv, Principal name is now Member ID (Long as String) for
    // JWT.

    @EventListener
    @Transactional(readOnly = true)
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        String sessionId = headerAccessor.getSessionId();

        if (user == null) {
            return; // Anonymous user
        }

        String memberIdStr = user.getName();
        log.info("🔌 User connected: {} (Session: {})", memberIdStr, sessionId);

        try {
            Long memberId = Long.parseLong(memberIdStr);
            redisStockService.addUserSession(memberIdStr, sessionId);

            List<InterestStock> stocks = interestStockRepository.findByMemberId(memberId);
            for (InterestStock stock : stocks) {
                String symbol = stock.getSymbol();

                // Track that this session is watching this symbol
                redisStockService.addSessionSubscription(sessionId, symbol);

                // Increment global refcount
                if (redisStockService.subscribe(symbol)) {
                    // First subscriber -> Connect to KIS WS
                    kisWebSocketService.subscribe(symbol);
                }

                // Fetch and send INITIAL snapshot
                // Run asynchronously to avoid blocking the event listener?
                // For now, run synchronously or use a managed executor if slow.
                try {
                    var initialData = kisService.getCurrentPrice(symbol);
                    if (initialData != null) {
                        messagingTemplate.convertAndSend("/api/v1/sub/stocks/" + symbol, initialData);
                        log.debug("📡 Sent initial snapshot for {}", symbol);
                    }
                } catch (Exception e) {
                    log.error("Failed to fetch initial price for {}", symbol, e);
                }
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid Member ID in Principal: {}", memberIdStr);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal user = headerAccessor.getUser();

        log.info("🔌 User disconnected: Session {}", sessionId);

        if (user != null) {
            String memberIdStr = user.getName();
            redisStockService.removeUserSession(memberIdStr, sessionId);
        }

        // Get symbols this session was watching
        Set<String> subscriptions = redisStockService.getSessionSubscriptions(sessionId);

        for (String symbol : subscriptions) {
            // Decrement global refcount
            if (redisStockService.unsubscribe(symbol)) {
                // Last subscriber -> Disconnect from KIS
                kisWebSocketService.unsubscribe(symbol);
            }
        }

        // Clean up session data
        redisStockService.deleteSession(sessionId);
    }
}
