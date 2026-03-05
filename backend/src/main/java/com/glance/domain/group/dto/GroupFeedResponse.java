package com.glance.domain.group.dto;

import com.glance.domain.group.entity.GroupFeed;
import com.glance.domain.group.entity.GroupFeedActionType;

import java.time.LocalDateTime;

public record GroupFeedResponse(
        Long id,
        Long groupId,
        Long memberId,
        String nickname,
        GroupFeedActionType actionType,
        String content,
        LocalDateTime createdAt) {
    public static GroupFeedResponse from(GroupFeed feed) {
        return new GroupFeedResponse(
                feed.getId(),
                feed.getGroup().getId(),
                feed.getMember().getId(),
                feed.getMember().getNickname(),
                feed.getActionType(),
                feed.getContent(),
                feed.getCreatedAt());
    }
}
