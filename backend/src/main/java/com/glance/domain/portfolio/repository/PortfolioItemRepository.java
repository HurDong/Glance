package com.glance.domain.portfolio.repository;

import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.entity.PortfolioItem;
import com.glance.domain.stocks.entity.StockSymbol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
    Optional<PortfolioItem> findByPortfolioAndStockSymbol(Portfolio portfolio, StockSymbol stockSymbol);
}
