package com.glance.domain.group.dto;

import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.member.dto.MemberResponseDto;

import java.time.LocalDateTime;
import java.util.List;

public record PortfolioGroupResponse(
        Long id,
        String name,
        String description,
        MemberResponseDto owner,
        List<GroupMemberResponse> members,
        LocalDateTime createdAt) {
    public static PortfolioGroupResponse from(PortfolioGroup group, List<PortfolioGroupMember> members) {
        return new PortfolioGroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                MemberResponseDto.of(group.getOwner()),
                members.stream().map(GroupMemberResponse::from).toList(),
                group.getCreatedAt());
    }

    public record GroupMemberResponse(
            Long id,
            MemberResponseDto member,
            Long sharedPortfolioId,
            String sharedPortfolioName,
            LocalDateTime joinedAt) {
        public static GroupMemberResponse from(PortfolioGroupMember groupMember) {
            return new GroupMemberResponse(
                    groupMember.getId(),
                    MemberResponseDto.of(groupMember.getMember()),
                    groupMember.getSharedPortfolio() != null ? groupMember.getSharedPortfolio().getId() : null,
                    groupMember.getSharedPortfolio() != null ? groupMember.getSharedPortfolio().getName() : null,
                    groupMember.getCreatedAt());
        }
    }
}
