package com.glance.domain.stocks.repository;

import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockSymbol;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StockSymbolRepository extends JpaRepository<StockSymbol, Long> {
    Optional<StockSymbol> findBySymbolAndMarket(String symbol, Market market);

    List<StockSymbol> findAllByMarket(Market market);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM StockSymbol s WHERE " +
            "LOWER(s.symbol) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(s.nameKr) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(s.nameEn) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "ORDER BY " +
            "CASE WHEN LOWER(s.symbol) = LOWER(:query) THEN 1 " +
            "     WHEN LOWER(s.nameKr) = LOWER(:query) THEN 2 " +
            "     WHEN LOWER(s.nameEn) = LOWER(:query) THEN 3 " +
            "     WHEN LOWER(s.symbol) LIKE LOWER(CONCAT(:query, '%')) THEN 4 " +
            "     WHEN LOWER(s.nameKr) LIKE LOWER(CONCAT(:query, '%')) THEN 5 " +
            "     WHEN LOWER(s.nameEn) LIKE LOWER(CONCAT(:query, '%')) THEN 6 " +
            "     ELSE 7 END")
    Page<StockSymbol> searchStocks(@org.springframework.data.repository.query.Param("query") String query,
            Pageable pageable);
}
