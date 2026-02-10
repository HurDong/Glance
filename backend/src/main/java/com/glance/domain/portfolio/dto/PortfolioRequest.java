package com.glance.domain.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

public record PortfolioRequest(
        @NotBlank(message = "포트폴리오 이름을 입력해주세요.") String name,
        String description,
        Boolean isPublic) {
    @Builder
    public PortfolioRequest {
    }
}
