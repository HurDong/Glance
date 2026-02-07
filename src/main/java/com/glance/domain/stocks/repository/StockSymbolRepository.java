package com.glance.domain.stocks.repository;

import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockSymbol;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StockSymbolRepository extends JpaRepository<StockSymbol, Long> {
    Optional<StockSymbol> findBySymbolAndMarket(String symbol, Market market);
}
