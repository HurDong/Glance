package com.glance.domain.group.repository;

import com.glance.domain.group.entity.GroupPortfolioReaction;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.group.entity.ReactionType;
import com.glance.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupPortfolioReactionRepository extends JpaRepository<GroupPortfolioReaction, Long> {
    Optional<GroupPortfolioReaction> findByMemberAndTargetMembershipAndType(Member member, PortfolioGroupMember targetMembership, ReactionType type);
    List<GroupPortfolioReaction> findAllByTargetMembership(PortfolioGroupMember targetMembership);
}
