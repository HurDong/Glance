package com.glance.domain.stocks.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

import com.glance.domain.stocks.dto.StockPriceMessage;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisStockService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisMessageListenerContainer redisMessageListenerContainer;
    private final StockPriceRedisListener stockPriceRedisListener;
    private final ObjectMapper objectMapper;

    private static final String KEY_PREFIX_COUNT = "stock:count:";
    private static final String KEY_PREFIX_SESSION = "session:stocks:";
    private static final String KEY_PREFIX_USER_SESSIONS = "user:sessions:";
    private static final String CHANNEL_PREFIX = "stock.price.";

    private final Map<String, AtomicInteger> localSubscriptionCounts = new ConcurrentHashMap<>();

    /**
     * Publish stock price update to Redis channel.
     */
    public void publish(String symbol, StockPriceMessage message) {
        try {
            String jsonEntry = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(CHANNEL_PREFIX + symbol, jsonEntry);
        } catch (Exception e) {
            log.error("Failed to serialize message for symbol {}", symbol, e);
        }
    }

    /**
     * Subscribe to a specific stock channel (Local Instance Listener).
     * Uses local reference counting to avoid duplicate listeners.
     */
    public void subscribeToChannel(String symbol) {
        localSubscriptionCounts.compute(symbol, (k, v) -> {
            if (v == null) {
                // First local subscription, add listener
                redisMessageListenerContainer.addMessageListener(stockPriceRedisListener,
                        new ChannelTopic(CHANNEL_PREFIX + symbol));
                return new AtomicInteger(1);
            } else {
                v.incrementAndGet();
                return v;
            }
        });
    }

    /**
     * Unsubscribe from a specific stock channel (Local Instance Listener).
     * Uses local reference counting to remove listener only when last local
     * subscriber leaves.
     */
    public void unsubscribeFromChannel(String symbol) {
        localSubscriptionCounts.computeIfPresent(symbol, (k, v) -> {
            int count = v.decrementAndGet();
            if (count <= 0) {
                // Last local subscription, remove listener
                redisMessageListenerContainer.removeMessageListener(stockPriceRedisListener,
                        new ChannelTopic(CHANNEL_PREFIX + symbol));
                return null; // Remove from map
            }
            return v;
        });
    }

    /**
     * Increment subscription count for a symbol.
     * 
     * @return true if this is the first subscription (count 0 -> 1)
     */
    public boolean subscribe(String symbol) {
        Long count = redisTemplate.opsForValue().increment(KEY_PREFIX_COUNT + symbol);
        return count != null && count == 1;
    }

    /**
     * Decrement subscription count for a symbol.
     * 
     * @return true if this was the last subscription (count 1 -> 0)
     */
    public boolean unsubscribe(String symbol) {
        Long count = redisTemplate.opsForValue().decrement(KEY_PREFIX_COUNT + symbol);
        if (count != null && count <= 0) {
            redisTemplate.delete(KEY_PREFIX_COUNT + symbol); // Clean up
            return true;
        }
        return false;
    }

    // --- Session Management ---

    public void addSessionSubscription(String sessionId, String symbol) {
        redisTemplate.opsForSet().add(KEY_PREFIX_SESSION + sessionId, symbol);
    }

    public void removeSessionSubscription(String sessionId, String symbol) {
        redisTemplate.opsForSet().remove(KEY_PREFIX_SESSION + sessionId, symbol);
    }

    public Set<String> getSessionSubscriptions(String sessionId) {
        Set<Object> members = redisTemplate.opsForSet().members(KEY_PREFIX_SESSION + sessionId);
        if (members == null)
            return Set.of();
        return members.stream().map(Object::toString).collect(Collectors.toSet());
    }

    public void deleteSession(String sessionId) {
        redisTemplate.delete(KEY_PREFIX_SESSION + sessionId);
    }

    // --- User Session Mapping ---

    public void addUserSession(String userId, String sessionId) {
        redisTemplate.opsForSet().add(KEY_PREFIX_USER_SESSIONS + userId, sessionId);
    }

    public void removeUserSession(String userId, String sessionId) {
        redisTemplate.opsForSet().remove(KEY_PREFIX_USER_SESSIONS + userId, sessionId);
    }

    public Set<String> getUserSessions(String userId) {
        Set<Object> members = redisTemplate.opsForSet().members(KEY_PREFIX_USER_SESSIONS + userId);
        if (members == null)
            return Set.of();
        return members.stream().map(Object::toString).collect(Collectors.toSet());
    }

    // --- Monitoring & Management ---

    public Map<String, Integer> getLocalSubscriptionCounts() {
        return localSubscriptionCounts.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().get()));
    }

    public Long getGlobalSubscriptionCount(String symbol) {
        Object count = redisTemplate.opsForValue().get(KEY_PREFIX_COUNT + symbol);
        return count != null ? Long.parseLong(count.toString()) : 0L;
    }
}
