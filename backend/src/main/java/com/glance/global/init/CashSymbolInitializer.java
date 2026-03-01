package com.glance.global.init;

import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.SecurityType;
import com.glance.domain.stocks.entity.StockStatus;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 앱 시작 시 현금 자산용 가상 StockSymbol 레코드(KRW, USD)를 DB에 upsert합니다.
 * PortfolioItem은 StockSymbol FK를 필요로 하기 때문에 스키마 변경 없이 이 방식으로 현금을 지원합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CashSymbolInitializer {

    private final StockSymbolRepository stockSymbolRepository;

    @PostConstruct
    @Transactional
    public void initCashSymbols() {
        insertIfAbsent("KRW", Market.CASH, "원화 현금", "KRW Cash");
        insertIfAbsent("USD", Market.CASH, "달러 현금", "USD Cash");
        log.info("[CashSymbolInitializer] 현금 심볼 초기화 완료 (KRW, USD)");
    }

    private void insertIfAbsent(String symbol, Market market, String nameKr, String nameEn) {
        boolean exists = stockSymbolRepository.findBySymbolAndMarket(symbol, market).isPresent();
        if (!exists) {
            StockSymbol cashSymbol = StockSymbol.builder()
                    .symbol(symbol)
                    .market(market)
                    .nameKr(nameKr)
                    .nameEn(nameEn)
                    .status(StockStatus.ACTIVE)
                    .securityType(SecurityType.CASH)
                    .build();
            stockSymbolRepository.save(cashSymbol);
            log.info("[CashSymbolInitializer] 현금 심볼 생성: {} ({})", symbol, nameKr);
        }
    }
}
