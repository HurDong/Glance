package com.glance.domain.group.dto;

import lombok.Builder;

public record GroupShareRequest(
        Long portfolioId) {
    @Builder
    public GroupShareRequest {
    }
}
