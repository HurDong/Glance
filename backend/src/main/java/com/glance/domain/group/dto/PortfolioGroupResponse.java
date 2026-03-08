package com.glance.domain.group.dto;

import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.group.entity.GroupPortfolioReaction;
import com.glance.domain.group.entity.ReactionType;
import com.glance.domain.portfolio.dto.PortfolioItemResponse;
import com.glance.domain.member.dto.MemberResponseDto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record PortfolioGroupResponse(
        Long id,
        String name,
        String description,
        String inviteCode,
        MemberResponseDto owner,
        List<GroupMemberResponse> members,
        LocalDateTime createdAt) {
    public static PortfolioGroupResponse from(PortfolioGroup group, List<PortfolioGroupMember> members,
            Long currentMemberId, Map<Long, List<GroupPortfolioReaction>> reactionsMap) {
        return new PortfolioGroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getInviteCode(),
                MemberResponseDto.of(group.getOwner()),
                members.stream()
                        .map(m -> GroupMemberResponse.from(m, currentMemberId, reactionsMap.getOrDefault(m.getId(), new ArrayList<>())))
                        .toList(),
                group.getCreatedAt());
    }

    public record GroupMemberResponse(
            Long id,
            MemberResponseDto member,
            Long sharedPortfolioId,
            String sharedPortfolioName,
            Boolean sharedPortfolioIsPublic,
            List<PortfolioItemResponse> sharedPortfolioItems,
            List<ReactionCountResponse> reactions,
            String status,
            LocalDateTime joinedAt) {
        public static GroupMemberResponse from(PortfolioGroupMember groupMember, Long currentMemberId,
                List<GroupPortfolioReaction> reactions) {
            List<PortfolioItemResponse> items = new ArrayList<>();
            if (groupMember.getSharedPortfolio() != null) {
                try {
                    items = groupMember.getSharedPortfolio().getItems().stream()
                            .map(PortfolioItemResponse::from)
                            .toList();
                } catch (Exception e) {
                    // Portfolio might be partially deleted or corrupted
                    items = new ArrayList<>();
                }
            }

            // Reaction calculation
            List<ReactionCountResponse> reactionCounts = Arrays.stream(ReactionType.values())
                    .map(type -> {
                        long count = reactions.stream().filter(r -> r.getType() == type).count();
                        boolean reactedByMe = reactions.stream()
                                .anyMatch(r -> r.getType() == type && r.getMember().getId().equals(currentMemberId));
                        return ReactionCountResponse.builder()
                                .type(type)
                                .count(count)
                                .reactedByMe(reactedByMe)
                                .build();
                    }).toList();

            return new GroupMemberResponse(
                    groupMember.getId(),
                    MemberResponseDto.of(groupMember.getMember()),
                    groupMember.getSharedPortfolio() != null ? groupMember.getSharedPortfolio().getId() : null,
                    groupMember.getSharedPortfolio() != null ? groupMember.getSharedPortfolio().getName() : null,
                    groupMember.getSharedPortfolio() != null ? groupMember.getSharedPortfolio().getIsPublic() : null,
                    items,
                    reactionCounts,
                    groupMember.getStatus().name(),
                    groupMember.getCreatedAt());
        }
    }
}
