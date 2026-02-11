package com.glance.domain.portfolio.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.portfolio.dto.PortfolioItemRequest;
import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @PostMapping
    public ApiResponse<PortfolioResponse> createPortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PortfolioRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PortfolioResponse response = portfolioService.createPortfolio(userId, request);
        return ApiResponse.success("포트폴리오가 생성되었습니다.", response);
    }

    @GetMapping
    public ApiResponse<List<PortfolioResponse>> getMyPortfolios(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        List<PortfolioResponse> responses = portfolioService.getMyPortfolios(userId);
        return ApiResponse.success(responses);
    }

    @GetMapping("/{portfolioId}")
    public ApiResponse<PortfolioResponse> getPortfolio(
            @PathVariable Long portfolioId) {
        PortfolioResponse response = portfolioService.getPortfolio(portfolioId);
        return ApiResponse.success(response);
    }

    @PostMapping("/{portfolioId}/items")
    public ApiResponse<Void> addPortfolioItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long portfolioId,
            @Valid @RequestBody PortfolioItemRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        portfolioService.addPortfolioItem(portfolioId, userId, request);
        return ApiResponse.success("포트폴리오에 종목이 추가되었습니다.");
    }

    @PutMapping("/{portfolioId}/items/{itemId}")
    public ApiResponse<Void> updatePortfolioItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long portfolioId,
            @PathVariable Long itemId,
            @Valid @RequestBody PortfolioItemRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        portfolioService.updatePortfolioItem(portfolioId, itemId, userId, request);
        return ApiResponse.success("포트폴리오 종목이 수정되었습니다.");
    }

    @DeleteMapping("/{portfolioId}/items/{itemId}")
    public ApiResponse<Void> deletePortfolioItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long portfolioId,
            @PathVariable Long itemId) {
        Long userId = Long.parseLong(userDetails.getUsername());
        portfolioService.deletePortfolioItem(portfolioId, itemId, userId);
        return ApiResponse.success("포트폴리오 종목이 삭제되었습니다.");
    }

    @PutMapping("/{portfolioId}")
    public ApiResponse<PortfolioResponse> updatePortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long portfolioId,
            @Valid @RequestBody PortfolioRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PortfolioResponse response = portfolioService.updatePortfolio(portfolioId, userId, request);
        return ApiResponse.success("포트폴리오가 수정되었습니다.", response);
    }
}
