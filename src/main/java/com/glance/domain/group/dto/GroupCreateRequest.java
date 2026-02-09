package com.glance.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

public record GroupCreateRequest(
        @NotBlank(message = "그룹 이름을 입력해주세요.") String name,
        String description) {
    @Builder
    public GroupCreateRequest {
    }
}
