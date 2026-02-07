package com.glance.batch.controller;

import com.glance.batch.service.KoreaStockMasterService;
import com.glance.batch.service.USStockMasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/batch")
@RequiredArgsConstructor
public class BatchController {

    private final USStockMasterService usStockMasterService;
    private final KoreaStockMasterService koreaStockMasterService;

    @PostMapping("/manual/us")
    public String runUSBatch() {
        usStockMasterService.syncUSStocks();
        return "US Stock Batch Started Manually";
    }

    @PostMapping("/manual/kr")
    public String runKRBatch() {
        koreaStockMasterService.syncKoreaStocks();
        return "Korea Stock Batch Started Manually";
    }

    @PostMapping("/manual/all")
    public String runAll() {
        usStockMasterService.syncUSStocks();
        koreaStockMasterService.syncKoreaStocks();
        return "All Stock Batch Started Manually";
    }
}
