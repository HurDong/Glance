package com.glance.domain.stocks.controller;

import com.glance.domain.stocks.dto.MarketIndexDto;
import com.glance.domain.stocks.service.MarketIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
public class MarketIndexController {

    private final MarketIndexService marketIndexService;

    @GetMapping("/indices")
    public ResponseEntity<List<MarketIndexDto>> getIndices() {
        return ResponseEntity.ok(marketIndexService.getIndices());
    }
}
