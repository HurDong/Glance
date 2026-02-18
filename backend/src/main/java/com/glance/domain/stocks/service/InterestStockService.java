package com.glance.domain.stocks.service;

import com.glance.domain.member.entity.Member;
import com.glance.domain.member.repository.MemberRepository;
import com.glance.domain.stocks.entity.InterestStock;
import com.glance.domain.stocks.repository.InterestStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.glance.domain.stocks.dto.InterestStockResponse;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterestStockService {

    private final InterestStockRepository interestStockRepository;
    private final MemberRepository memberRepository;
    private final StockSymbolRepository stockSymbolRepository;
    private final KisWebSocketService kisWebSocketService;
    private final RedisStockService redisStockService;

    @Transactional
    public void addInterestStock(String memberIdStr, String symbol, String market) {
        Long memberId = Long.parseLong(memberIdStr);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> {
                    // System.out.println("DEBUG: Member not found for ID: " + memberId);
                    return new IllegalArgumentException("Member not found: " + memberId);
                });

        String upperSymbol = symbol.toUpperCase();

        if (interestStockRepository.findByMemberIdAndSymbol(member.getId(), upperSymbol).isPresent()) {
            return;
        }

        try {
            interestStockRepository.save(InterestStock.builder()
                    .member(member)
                    .symbol(upperSymbol)
                    .market(market)
                    .build());

            // For all active sessions of this user, add subscription
            Set<String> sessions = redisStockService.getUserSessions(memberIdStr);
            for (String sessionId : sessions) {
                redisStockService.addSessionSubscription(sessionId, upperSymbol);
                // Subscribe to Redis Channel (Local Instance)
                redisStockService.subscribeToChannel(upperSymbol);

                // Increment global refcount (once per session adding it)
                if (redisStockService.subscribe(upperSymbol)) {
                    kisWebSocketService.subscribe(upperSymbol);
                }
            }

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Ignore duplicate entry if race condition occurred
        }
    }

    @Transactional
    public void removeInterestStock(String memberIdStr, String symbol) {
        Long memberId = Long.parseLong(memberIdStr);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        interestStockRepository.deleteByMemberIdAndSymbol(member.getId(), symbol);

        // For all active sessions of this user, remove subscription
        Set<String> sessions = redisStockService.getUserSessions(memberIdStr);
        for (String sessionId : sessions) {
            redisStockService.removeSessionSubscription(sessionId, symbol);

            // Unsubscribe from Redis Channel (Local Instance)
            redisStockService.unsubscribeFromChannel(symbol);

            // Decrement global refcount
            if (redisStockService.unsubscribe(symbol)) {
                kisWebSocketService.unsubscribe(symbol);
            }
        }
    }

    public List<InterestStockResponse> getInterestStocks(String memberIdStr) {
        Long memberId = Long.parseLong(memberIdStr);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        List<InterestStock> interestStocks = interestStockRepository.findByMemberId(member.getId());
        List<String> symbols = interestStocks.stream()
                .map(InterestStock::getSymbol)
                .toList();

        Map<String, StockSymbol> symbolMap = stockSymbolRepository.findAllBySymbolIn(symbols).stream()
                .collect(Collectors.toMap(StockSymbol::getSymbol, Function.identity(),
                        (existing, replacement) -> existing));

        return interestStocks.stream()
                .map(stock -> {
                    StockSymbol stockSymbol = symbolMap.get(stock.getSymbol());
                    return InterestStockResponse.builder()
                            .id(stock.getId())
                            .symbol(stock.getSymbol())
                            .market(stock.getMarket())
                            .nameKr(stockSymbol != null ? stockSymbol.getNameKr() : null)
                            .nameEn(stockSymbol != null ? stockSymbol.getNameEn() : null)
                            .securityType(stockSymbol != null ? stockSymbol.getSecurityType().name() : "STOCK")
                            .build();
                })
                .toList();
    }
}
