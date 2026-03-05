package com.glance.domain.group.repository;

import com.glance.domain.group.entity.GroupFeed;
import com.glance.domain.group.entity.PortfolioGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupFeedRepository extends JpaRepository<GroupFeed, Long> {
    List<GroupFeed> findAllByGroupOrderByCreatedAtDesc(PortfolioGroup group);

    List<GroupFeed> findTop50ByGroupOrderByCreatedAtDesc(PortfolioGroup group);

    void deleteAllByGroup(PortfolioGroup group);
}
