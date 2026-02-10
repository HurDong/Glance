package com.glance.domain.group.repository;

import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioGroupMemberRepository extends JpaRepository<PortfolioGroupMember, Long> {
    List<PortfolioGroupMember> findAllByGroup(PortfolioGroup group);

    List<PortfolioGroupMember> findAllByMember(Member member);

    Optional<PortfolioGroupMember> findByGroupAndMember(PortfolioGroup group, Member member);
}
