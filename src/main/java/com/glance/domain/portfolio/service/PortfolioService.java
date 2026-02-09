package com.glance.domain.portfolio.service;

import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.repository.PortfolioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;

    @Transactional
    public PortfolioResponse createPortfolio(Long userId, PortfolioRequest request) {
        Portfolio portfolio = Portfolio.builder()
                .userId(userId)
                .name(request.name())
                .description(request.description())
                .isPublic(request.isPublic())
                .build();

        Portfolio saved = portfolioRepository.save(portfolio);
        return PortfolioResponse.from(saved);
    }

    public List<PortfolioResponse> getMyPortfolios(Long userId) {
        return portfolioRepository.findAllByUserId(userId).stream()
                .map(PortfolioResponse::from)
                .collect(Collectors.toList());
    }
}
