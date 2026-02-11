package com.glance.batch.service;

import com.glance.domain.stocks.config.KisProperties;
import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class KoreaStockMasterServiceTest {

    @Mock
    private StockSymbolRepository stockSymbolRepository;

    private KoreaStockMasterService koreaStockMasterService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        KisProperties properties = new KisProperties();
        properties.setKospiMasterUrl("https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip");
        properties.setKosdaqMasterUrl("https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip");

        koreaStockMasterService = new KoreaStockMasterService(stockSymbolRepository, properties);

        // Mock repository behavior
        when(stockSymbolRepository.findAllByMarket(any(Market.class))).thenReturn(Collections.emptyList());
    }

    @Test
    void syncKoreaStocks_ShouldDownloadAndSave() {
        // This test downloads the real file and verifies parsing + save call.
        // It does NOT require a DB connection because repository is mocked.
        koreaStockMasterService.syncKoreaStocks();

        // Verify saveAll was called (implies successful download and parsing)
        verify(stockSymbolRepository, times(2)).saveAll(any());
    }
}
