package com.glance.domain.portfolio.repository;

import com.glance.domain.member.entity.Member;
import com.glance.domain.portfolio.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findAllByMember(Member member);

    Optional<Portfolio> findByMemberAndIsPrimaryTrue(Member member);
}
