package com.glance.domain.group.dto;

import com.glance.domain.group.entity.ReactionType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReactionCountResponse {
    private ReactionType type;
    private long count;
    private boolean reactedByMe;
}
