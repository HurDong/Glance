package com.glance.batch.runner;

import com.glance.batch.service.KoreaStockMasterService;
import com.glance.batch.service.USStockMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InitialDataSeeder implements ApplicationRunner {

    private final USStockMasterService usStockMasterService;
    private final KoreaStockMasterService koreaStockMasterService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("🚀 Starting Initial Stock Master Sync...");

        try {
            usStockMasterService.syncUSStocks();
        } catch (Exception e) {
            log.error("Failed to sync US Stocks on startup", e);
        }

        try {
            koreaStockMasterService.syncKoreaStocks();
        } catch (Exception e) {
            log.error("Failed to sync Korea Stocks on startup", e);
        }

        log.info("✅ Initial Stock Master Sync Completed.");
    }
}
