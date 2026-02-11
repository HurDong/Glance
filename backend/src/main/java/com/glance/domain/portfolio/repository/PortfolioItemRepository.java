package com.glance.domain.portfolio.repository;

import com.glance.domain.portfolio.entity.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
}
