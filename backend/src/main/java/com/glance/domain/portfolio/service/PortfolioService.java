package com.glance.domain.portfolio.service;

import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.service.MemberService;
import com.glance.domain.portfolio.dto.PortfolioItemRequest;
import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.entity.PortfolioItem;
import com.glance.domain.portfolio.repository.PortfolioItemRepository;
import com.glance.domain.portfolio.repository.PortfolioRepository;
import com.glance.domain.stocks.entity.Market;
import com.glance.domain.stocks.entity.StockSymbol;
import com.glance.domain.stocks.repository.StockSymbolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final StockSymbolRepository stockSymbolRepository;
    private final MemberService memberService;

    @Transactional
    public PortfolioResponse createPortfolio(Long userId, PortfolioRequest request) {
        Member member = memberService.getMember(userId);

        Portfolio portfolio = Portfolio.builder()
                .member(member)
                .name(request.name())
                .description(request.description())
                .isPublic(request.isPublic())
                .build();

        Portfolio saved = portfolioRepository.save(portfolio);
        return PortfolioResponse.from(saved);
    }

    public List<PortfolioResponse> getMyPortfolios(Long userId) {
        Member member = memberService.getMember(userId);
        return portfolioRepository.findAllByMember(member).stream()
                .map(PortfolioResponse::from)
                .collect(Collectors.toList());
    }

    public PortfolioResponse getPortfolio(Long portfolioId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        return PortfolioResponse.from(portfolio);
    }

    @Transactional
    public void addPortfolioItem(Long portfolioId, Long userId, PortfolioItemRequest request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!portfolio.getMember().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.HANDLE_ACCESS_DENIED);
        }

        // market이 제공된 경우 (e.g. CASH) 정확히 일치하는 심볼을 조회
        StockSymbol stockSymbol;
        if (request.market() != null && !request.market().isBlank()) {
            Market market;
            try {
                market = Market.valueOf(request.market().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            }
            stockSymbol = stockSymbolRepository.findBySymbolAndMarket(request.symbol(), market)
                    .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        } else {
            stockSymbol = stockSymbolRepository.findBySymbol(request.symbol())
                    .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        }

        Optional<PortfolioItem> existingItemOpt = portfolioItemRepository.findByPortfolioAndStockSymbol(portfolio,
                stockSymbol);

        if (existingItemOpt.isPresent()) {
            PortfolioItem existingItem = existingItemOpt.get();
            BigDecimal oldQuantity = existingItem.getQuantity();
            BigDecimal oldPrice = existingItem.getAveragePrice();
            BigDecimal newQuantityReq = request.quantity();
            BigDecimal newPriceReq = request.averagePrice();

            BigDecimal totalQuantity = oldQuantity.add(newQuantityReq);

            // weighted average = (oldQuantity * oldPrice + newQuantityReq * newPriceReq) /
            // totalQuantity
            BigDecimal oldTotal = oldQuantity.multiply(oldPrice);
            BigDecimal newTotal = newQuantityReq.multiply(newPriceReq);
            BigDecimal combinedTotal = oldTotal.add(newTotal);

            BigDecimal newAveragePrice = combinedTotal.divide(totalQuantity, 4, RoundingMode.HALF_UP);

            existingItem.update(totalQuantity, newAveragePrice, request.currency());
        } else {
            PortfolioItem item = PortfolioItem.builder()
                    .stockSymbol(stockSymbol)
                    .quantity(request.quantity())
                    .averagePrice(request.averagePrice())
                    .currency(request.currency())
                    .build();

            portfolio.addItem(item);
        }
    }

    @Transactional
    public void updatePortfolioItem(Long portfolioId, Long itemId, Long userId, PortfolioItemRequest request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!portfolio.getMember().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.HANDLE_ACCESS_DENIED);
        }

        PortfolioItem item = portfolioItemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!item.getPortfolio().getId().equals(portfolioId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        item.update(request.quantity(), request.averagePrice(), request.currency());
    }

    @Transactional
    public void deletePortfolioItem(Long portfolioId, Long itemId, Long userId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!portfolio.getMember().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.HANDLE_ACCESS_DENIED);
        }

        PortfolioItem item = portfolioItemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!item.getPortfolio().getId().equals(portfolioId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        portfolio.removeItem(item);
        portfolioItemRepository.delete(item);
    }

    @Transactional
    public PortfolioResponse updatePortfolio(Long portfolioId, Long userId, PortfolioRequest request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        if (!portfolio.getMember().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.HANDLE_ACCESS_DENIED);
        }

        portfolio.update(request.name(), request.description(), request.isPublic());
        return PortfolioResponse.from(portfolio);
    }
}
