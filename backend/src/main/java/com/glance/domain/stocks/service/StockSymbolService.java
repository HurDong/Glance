package com.glance.domain.stocks.service;

import com.glance.domain.stocks.dto.StockResponse;
import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockSymbolService {

    private final StockSymbolRepository stockSymbolRepository;

    public Page<StockResponse> getStocks(String query, Market market, Pageable pageable) {
        Page<StockSymbol> stockPage;

        if (query == null || query.trim().isEmpty()) {
            if (market != null) {
                stockPage = stockSymbolRepository.findAllByMarket(market, pageable);
            } else {
                stockPage = stockSymbolRepository.findAll(pageable);
            }
        } else {
            String searchTerm = query.trim();
            if (market != null) {
                stockPage = stockSymbolRepository.searchStocksByMarket(searchTerm, market, pageable);
            } else {
                stockPage = stockSymbolRepository.searchStocks(searchTerm, pageable);
            }
        }

        return stockPage.map(StockResponse::from);
    }

    @Transactional
    public void upsertStockSymbols(List<StockSymbol> newSymbols) {
        // 1. Load all existing symbols for the given markets (or all) to minimize DB
        // hits
        // Assuming we process one market at a time or just load all.
        // For safety, let's just load all by symbols if list is small, OR load ALL
        // active.
        // KOSPI+KOSDAQ is ~3000. Loading all is fine.
        List<StockSymbol> existingList = stockSymbolRepository.findAll();
        var existingMap = existingList.stream()
                .collect(Collectors.toMap(
                        s -> s.getSymbol() + "-" + s.getMarket(),
                        s -> s,
                        (existing, replacement) -> existing // Keep existing if duplicate in DB
                ));

        List<StockSymbol> toSave = newSymbols.stream()
                .map(newSymbol -> {
                    String key = newSymbol.getSymbol() + "-" + newSymbol.getMarket();
                    StockSymbol existing = existingMap.get(key);
                    if (existing != null) {
                        // Update if changed
                        existing.updateInfo(newSymbol.getNameKr(), newSymbol.getNameEn(), newSymbol.getStatus(),
                                newSymbol.getSecurityType());
                        return existing;
                    } else {
                        return newSymbol;
                    }
                })
                .collect(Collectors.toList());

        stockSymbolRepository.saveAll(toSave);
    }
}
