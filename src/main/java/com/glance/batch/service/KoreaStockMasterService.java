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

    // Schedule: 08:35 KST every day (after US market sync)
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

            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(fileBytes));
                    BufferedReader br = new BufferedReader(new InputStreamReader(zis, "EUC-KR"))) {

                ZipEntry entry = zis.getNextEntry();
                while (entry != null) {
                    if (!entry.isDirectory()) {
                        log.info("Reading file inside zip: {}", entry.getName());
                        String line;
                        while ((line = br.readLine()) != null) {
                            parseAndUpsert(line, market);
                        }
                    }
                    entry = zis.getNextEntry();
                }
            }
        } catch (Exception e) {
            log.error("Error processing market {}", market, e);
        }
    }

    private void parseAndUpsert(String line, Market market) {
        // KOSPI/KOSDAQ Master File Spec (Byte-based fixed length)
        // Encoding: CP949 (EUC-KR)
        // Since we are reading lines with BufferedReader(EUC-KR), 'line' is already a
        // Java String.
        // HOWEVER, "Fixed Length" usually refers to BYTE length, not character length.
        // Retrieving substrings by indices from a String can be tricky if there are
        // multi-byte characters mixed in.
        // But conveniently, the provided spec usually ensures fields like 'Symbol' are
        // alphanumeric (1 byte = 1 char).
        // Let's use byte-based parsing for safety if needed, or careful substring if
        // confident.

        // Common Structure (based on KIS sample):
        // 0-1 : (Length 2) Separator?
        // 2-13: (Length 12) Full Code (e.g. KR7005930003)
        // ... Symbol is usually contained here or later.
        // But recent KIS master files often have the "Short Code" (Symbol) separately.

        // Let's look at the PoC output for '005930' (Samsung):
        // Context: "001275 KR7001271006부국증권우..."

        // It seems the line STARTS with Short Code (Symbol).
        // "001275" -> 6 chars.
        // Then spaces?
        // Then "KR7..." (Full Code).
        // Then Name.

        // Based on typical KIS (Korea Investment & Securities) Master File Layout:
        // Position | Length | Description
        // -------------------------------
        // 0 | 9 | Symbol (Short Code) - but often 6 digits + spaces?
        // 9 | 12 | Standard Code (ISIN, e.g. KR7005930003)
        // 21 | 40 | Name (Korean) - Mixed bytes!

        // Wait, the PoC output was: "001275 KR7001271006부국증권우..."
        // 0123456789012345678901...
        // 001275 (Space padding to index 8?)
        // KR7001271006 (Starts at index 9?)

        // Let's try simple substring based on this observation.
        // Symbol: 0 to 6 (trim) -> "001275"
        // Name: Starts after ISIN. ISIN is 12 chars.
        // 0-8: Symbol Area (9 bytes)
        // 9-20: ISIN (12 bytes)
        // 21-60: Name KR (40 bytes) ... BE CAREFUL with substring on String vs Bytes.

        // Strategy: Convert line back to bytes (EUC-KR) to safely extract fields by
        // byte offset.
        try {
            byte[] lineBytes = line.getBytes("EUC-KR");

            // Safety check
            if (lineBytes.length < 50)
                return;

            // Symbol (Short Code): Offsets 0-8 (9 bytes)
            String symbol = new String(lineBytes, 0, 9, "EUC-KR").trim();

            // Name KR: Offsets 21-60 (40 bytes)
            // Note: KIS spec says Name is 40 bytes.
            // Let's verify start index.
            // "001275 " (9 bytes) + "KR7001271006" (12 bytes) = 21 bytes. Correct.
            String nameKr = new String(lineBytes, 21, 40, "EUC-KR").trim();

            // Name EN: Standard KIS spec usually puts English name much later.
            // For now, let's just save KR name and Symbol.
            // If needed, we can hunt for ENG name later or assume it's after KR Name.
            // KOSPI master often: ... NameKR(40) ...

            if (symbol.isEmpty())
                return;

            // Remove "A" prefix if exists (some codes have 'A' prefix in internal systems)
            if (symbol.startsWith("A")) {
                symbol = symbol.substring(1);
            }

            // Update DB
            StockSymbol stockSymbol = stockSymbolRepository.findBySymbolAndMarket(symbol, market)
                    .orElse(StockSymbol.builder()
                            .symbol(symbol)
                            .market(market)
                            .status(StockStatus.ACTIVE)
                            .build());

            stockSymbol.updateInfo(nameKr, null, StockStatus.ACTIVE); // English name tentative null
            stockSymbolRepository.save(stockSymbol);

        } catch (Exception e) {
            log.warn("Failed to parse line: {}", line, e);
        }
    }
}
