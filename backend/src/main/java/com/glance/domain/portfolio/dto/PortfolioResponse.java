package com.glance.domain.portfolio.dto;

import com.glance.domain.portfolio.entity.Portfolio;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record PortfolioResponse(
        Long id,
        Long userId,
        String name,
        String description,
        Boolean isPublic,
        LocalDateTime createdAt,
        java.util.List<PortfolioItemResponse> items) {

    public static PortfolioResponse from(Portfolio portfolio) {
        return PortfolioResponse.builder()
                .id(portfolio.getId())
                .userId(portfolio.getMember().getId())
                .name(portfolio.getName())
                .description(portfolio.getDescription())
                .isPublic(portfolio.getIsPublic())
                .createdAt(portfolio.getCreatedAt())
                .items(portfolio.getItems().stream()
                        .map(PortfolioItemResponse::from)
                        .toList())
                .build();
    }
}
