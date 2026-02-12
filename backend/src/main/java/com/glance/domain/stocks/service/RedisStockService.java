package com.glance.domain.stocks.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RedisStockService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String KEY_PREFIX_COUNT = "stock:count:";
    private static final String KEY_PREFIX_SESSION = "session:stocks:";
    private static final String KEY_PREFIX_USER_SESSIONS = "user:sessions:";

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
}
