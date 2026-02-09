package com.glance.domain.portfolio.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @PostMapping
    public ApiResponse<PortfolioResponse> createPortfolio(
            @RequestHeader("X-User-Id") Long userId, // Auth 미배포 상태이므로 임시 헤더 사용
            @Valid @RequestBody PortfolioRequest request) {
        PortfolioResponse response = portfolioService.createPortfolio(userId, request);
        return ApiResponse.success("포트폴리오가 생성되었습니다.", response);
    }

    @GetMapping
    public ApiResponse<List<PortfolioResponse>> getMyPortfolios(
            @RequestHeader("X-User-Id") Long userId) {
        List<PortfolioResponse> responses = portfolioService.getMyPortfolios(userId);
        return ApiResponse.success(responses);
    }
}
