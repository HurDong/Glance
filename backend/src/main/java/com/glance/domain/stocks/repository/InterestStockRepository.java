package com.glance.domain.stocks.repository;

import com.glance.domain.stocks.entity.InterestStock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InterestStockRepository extends JpaRepository<InterestStock, Long> {
    List<InterestStock> findByMemberId(Long memberId);

    Optional<InterestStock> findByMemberIdAndSymbol(Long memberId, String symbol);

    void deleteByMemberIdAndSymbol(Long memberId, String symbol);
}
