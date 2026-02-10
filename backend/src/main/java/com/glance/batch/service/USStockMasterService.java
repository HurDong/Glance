package com.glance.batch.service;

import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockStatus;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class USStockMasterService {

    private final StockSymbolRepository stockSymbolRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String NASDAQ_URL = "https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip";
    private static final String NYSE_URL = "https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip";
    private static final String AMEX_URL = "https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip";

    // Schedule: 08:30 KST every day
    @Scheduled(cron = "0 30 8 * * *", zone = "Asia/Seoul")
    public void scheduleSync() {
        log.info("Starting Daily US Stock Master Sync...");
        syncUSStocks();
        log.info("Finished Daily US Stock Master Sync.");
    }

    @Transactional
    public void syncUSStocks() {
        processMarket(NASDAQ_URL, Market.NASDAQ);
        processMarket(NYSE_URL, Market.NYSE);
        processMarket(AMEX_URL, Market.AMEX);
    }

    private void processMarket(String url, Market market) {
        log.info("Processing Market: {}", market);
        try {
            byte[] fileBytes = restTemplate.getForObject(url, byte[].class);
            if (fileBytes == null) {
                log.error("Failed to download file from {}", url);
                return;
            }

            // 1. Load existing symbols into memory for fast lookup
            Map<String, StockSymbol> existingSymbols = stockSymbolRepository.findAllByMarket(market)
                    .stream()
                    .collect(Collectors.toMap(StockSymbol::getSymbol, Function.identity()));

            List<StockSymbol> toSave = new ArrayList<>();

            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(fileBytes));
                    BufferedReader br = new BufferedReader(new InputStreamReader(zis, "EUC-KR"))) {

                ZipEntry entry = zis.getNextEntry();
                while (entry != null) {
                    if (!entry.isDirectory()) {
                        log.info("Reading file inside zip: {}", entry.getName());
                        String line;
                        while ((line = br.readLine()) != null) {
                            processLine(line, market, existingSymbols, toSave);
                        }
                    }
                    entry = zis.getNextEntry();
                }
            }

            // 2. Batch Save
            if (!toSave.isEmpty()) {
                stockSymbolRepository.saveAll(toSave);
                log.info("Saved {} symbols for market {}", toSave.size(), market);
            }

        } catch (IOException e) {
            log.error("Error processing market {}", market, e);
        }
    }

    private void processLine(String line, Market market, Map<String, StockSymbol> existingMap,
            List<StockSymbol> toSave) {
        // KIS Master File Format (Tab-delimited) Analysis from PoC:
        // Index 4: Symbol (e.g., AACB)
        // Index 6: Name KR
        // Index 7: Name EN

        String[] parts = line.split("\t");
        if (parts.length < 8) {
            return;
        }

        String symbol = parts[4].trim();
        String nameKr = parts[6].trim();
        String nameEn = parts[7].trim();

        if (symbol.isEmpty())
            return;

        StockSymbol stockSymbol = existingMap.get(symbol);
        if (stockSymbol != null) {
            // Update existing
            stockSymbol.updateInfo(nameKr, nameEn, StockStatus.ACTIVE);
            toSave.add(stockSymbol); // Adding managed entity to list for explicit save (optional but safe)
        } else {
            // Create new
            StockSymbol newSymbol = StockSymbol.builder()
                    .symbol(symbol)
                    .market(market)
                    .nameKr(nameKr)
                    .nameEn(nameEn)
                    .status(StockStatus.ACTIVE)
                    .build();
            toSave.add(newSymbol);
            existingMap.put(symbol, newSymbol); // Prevent duplicates within same execution
        }
    }
}
