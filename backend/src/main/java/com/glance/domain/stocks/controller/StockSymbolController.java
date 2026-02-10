package com.glance.domain.stocks.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.stocks.dto.StockResponse;
import com.glance.domain.stocks.service.StockSymbolService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockSymbolController {

    private final StockSymbolService stockSymbolService;

    @GetMapping
    public ApiResponse<Page<StockResponse>> getStocks(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 50, sort = { "nameKr",
                    "symbol" }, direction = Sort.Direction.ASC) Pageable pageable) {
        return ApiResponse.success(stockSymbolService.getStocks(query, pageable));
    }
}
