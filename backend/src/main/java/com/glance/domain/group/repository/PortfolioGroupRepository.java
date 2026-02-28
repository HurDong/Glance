package com.glance.domain.group.repository;

import com.glance.domain.group.entity.PortfolioGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PortfolioGroupRepository extends JpaRepository<PortfolioGroup, Long> {
    Optional<PortfolioGroup> findByInviteCode(String inviteCode);
}
