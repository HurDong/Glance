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
import java.io.InputStreamReader;
import java.nio.charset.Charset;
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
public class KoreaStockMasterService {

    private final StockSymbolRepository stockSymbolRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String KOSPI_URL = "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip";
    private static final String KOSDAQ_URL = "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip";

    // Schedule: 08:35 KST every day
    @Scheduled(cron = "0 35 8 * * *", zone = "Asia/Seoul")
    public void scheduleSync() {
        log.info("Starting Daily Korea Stock Master Sync...");
        syncKoreaStocks();
        log.info("Finished Daily Korea Stock Master Sync.");
    }

    @Transactional
    public void syncKoreaStocks() {
        processMarket(KOSPI_URL, Market.KOSPI);
        processMarket(KOSDAQ_URL, Market.KOSDAQ);
    }

    private void processMarket(String url, Market market) {
        log.info("Processing Market: {}", market);
        try {
            byte[] fileBytes = restTemplate.getForObject(url, byte[].class);
            if (fileBytes == null) {
                log.error("Failed to download file from {}", url);
                return;
            }

            // 1. Load existing symbols
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

        } catch (Exception e) {
            log.error("Error processing market {}", market, e);
        }
    }

    private void processLine(String line, Market market, Map<String, StockSymbol> existingMap,
            List<StockSymbol> toSave) {
        try {
            byte[] lineBytes = line.getBytes("EUC-KR");
            if (lineBytes.length < 50)
                return;

            // Symbol: 0-8 (9 bytes)
            String symbol = new String(lineBytes, 0, 9, "EUC-KR").trim();
            // Name: 21-60 (40 bytes)
            String nameKr = new String(lineBytes, 21, 40, "EUC-KR").trim();

            if (symbol.isEmpty())
                return;

            if (symbol.startsWith("A")) {
                symbol = symbol.substring(1);
            }

            StockSymbol stockSymbol = existingMap.get(symbol);
            if (stockSymbol != null) {
                stockSymbol.updateInfo(nameKr, null, StockStatus.ACTIVE);
                toSave.add(stockSymbol);
            } else {
                StockSymbol newSymbol = StockSymbol.builder()
                        .symbol(symbol)
                        .market(market)
                        .nameKr(nameKr)
                        .status(StockStatus.ACTIVE)
                        .build();
                toSave.add(newSymbol);
                existingMap.put(symbol, newSymbol);
            }

        } catch (Exception e) {
            log.warn("Failed to parse line: {}", line, e);
        }
    }
}
