package com.glance.domain.stocks.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.common.util.SecurityUtil;
import com.glance.domain.stocks.dto.InterestStockResponse;
import com.glance.domain.stocks.service.InterestStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/stocks/interest")
@RequiredArgsConstructor
public class InterestStockController {

    private final InterestStockService interestStockService;

    @GetMapping
    public ApiResponse<List<InterestStockResponse>> getInterestStocks() {
        String memberIdStr = SecurityUtil.getCurrentUserEmail();
        return ApiResponse.success(interestStockService.getInterestStocks(memberIdStr));
    }

    @PostMapping("/{symbol}")
    public ApiResponse<Void> addInterestStock(@PathVariable String symbol,
            @RequestParam(defaultValue = "US") String market) {
        String memberIdStr = SecurityUtil.getCurrentUserEmail();
        interestStockService.addInterestStock(memberIdStr, symbol, market);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{symbol}")
    public ApiResponse<Void> removeInterestStock(@PathVariable String symbol) {
        String memberIdStr = SecurityUtil.getCurrentUserEmail();
        interestStockService.removeInterestStock(memberIdStr, symbol);
        return ApiResponse.success(null);
    }
}
