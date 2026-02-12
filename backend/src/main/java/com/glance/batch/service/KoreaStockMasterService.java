package com.glance.batch.service;

import com.glance.domain.stocks.config.KisProperties;
import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.SecurityType;
import com.glance.domain.stocks.entity.StockStatus;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.InputStream;
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
    private final KisProperties kisProperties;
    private final RestClient restClient = RestClient.create();

    // Schedule: 05:00 KST every day
    @Scheduled(cron = "0 0 5 * * *", zone = "Asia/Seoul")
    public void scheduleSync() {
        log.info("Starting Daily Korea Stock Master Sync...");
        syncKoreaStocks();
        log.info("Finished Daily Korea Stock Master Sync.");
    }

    @Transactional
    public void syncKoreaStocks() {
        processMarket(kisProperties.getKospiMasterUrl(), Market.KOSPI);
        processMarket(kisProperties.getKosdaqMasterUrl(), Market.KOSDAQ);
    }

    private void processMarket(String url, Market market) {
        log.info("Processing Market: {}", market);
        try {
            // Stream the file instead of loading all bytes into memory
            Resource resource = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Resource.class);

            if (resource == null) {
                log.error("Failed to download file from {}", url);
                return;
            }

            try (InputStream is = resource.getInputStream()) {
                // 1. Load existing symbols to memory for quick lookup
                // (Optimization: Only load symbol + id if possible, but minimal for now)
                Map<String, StockSymbol> existingSymbols = stockSymbolRepository.findAllByMarket(market)
                        .stream()
                        .collect(Collectors.toMap(StockSymbol::getSymbol, Function.identity()));

                List<StockSymbol> toSave = new ArrayList<>();

                try (ZipInputStream zis = new ZipInputStream(is);
                        BufferedReader br = new BufferedReader(new InputStreamReader(zis, Charset.forName("CP949")))) { // Use
                                                                                                                        // CP949

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
                    log.info("Saved/Updated {} symbols for market {}", toSave.size(), market);
                }
            }

        } catch (Exception e) {
            log.error("Error processing market {}", market, e);
        }
    }

    private void processLine(String line, Market market, Map<String, StockSymbol> existingMap,
            List<StockSymbol> toSave) {
        try {
            byte[] lineBytes = line.getBytes("CP949");
            // Standard length check (at least enough for symbol + name)
            if (lineBytes.length < 50)
                return;

            // Symbol: 0-9 (9 bytes)
            String symbol = new String(lineBytes, 0, 9, "CP949").trim();
            // Name: 21-61 (40 bytes) - Adjusted from 60 to 61 based on observation/spec
            // usually being slightly larger or safe margin
            // Previous code used 21-60. KIS spec says Name is 40 bytes. 21+40 = 61.
            int nameEnd = Math.min(61, lineBytes.length);
            String nameKr = new String(lineBytes, 21, nameEnd - 21, "CP949").trim();

            if (symbol.isEmpty())
                return;

            if (symbol.startsWith("A")) {
                symbol = symbol.substring(1);
            }

            StockSymbol stockSymbol = existingMap.get(symbol);
            if (stockSymbol != null) {
                // Update if name changed (rare) or duplicate processing
                if (!stockSymbol.getNameKr().equals(nameKr)) {
                    stockSymbol.updateInfo(nameKr, null, StockStatus.ACTIVE, SecurityType.STOCK);
                    toSave.add(stockSymbol); // Add to save list for batch update
                }
            } else {
                StockSymbol newSymbol = StockSymbol.builder()
                        .symbol(symbol)
                        .market(market)
                        .nameKr(nameKr)
                        .status(StockStatus.ACTIVE)
                        .build();
                toSave.add(newSymbol);
                existingMap.put(symbol, newSymbol); // Prevent duplicates in same batch
            }

        } catch (Exception e) {
            log.warn("Failed to parse line: {}", line, e);
        }
    }
}
