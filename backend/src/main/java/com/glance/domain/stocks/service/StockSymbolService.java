package com.glance.domain.stocks.service;

import com.glance.domain.stocks.dto.StockResponse;
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

    public Page<StockResponse> getStocks(String query, Pageable pageable) {
        Page<StockSymbol> stockPage;

        if (query == null || query.trim().isEmpty()) {
            stockPage = stockSymbolRepository.findAll(pageable);
        } else {
            String searchTerm = query.trim();
            stockPage = stockSymbolRepository.searchStocks(searchTerm, pageable);
        }

        return stockPage.map(StockResponse::from);
    }
}
