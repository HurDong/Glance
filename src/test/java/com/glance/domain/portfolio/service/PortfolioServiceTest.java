package com.glance.domain.portfolio.service;

import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.repository.PortfolioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @InjectMocks
    private PortfolioService portfolioService;

    @Test
    @DisplayName("포트폴리오 생성 성공")
    void createPortfolio_Success() {
        // given
        Long userId = 1L;
        PortfolioRequest request = PortfolioRequest.builder()
                .name("내 포트폴리오")
                .description("설명")
                .isPublic(true)
                .build();

        Portfolio portfolio = Portfolio.builder()
                .userId(userId)
                .name(request.name())
                .description(request.description())
                .isPublic(request.isPublic())
                .build();

        given(portfolioRepository.save(any(Portfolio.class))).willReturn(portfolio);

        // when
        PortfolioResponse response = portfolioService.createPortfolio(userId, request);

        // then
        assertThat(response.name()).isEqualTo(request.name());
        verify(portfolioRepository).save(any(Portfolio.class));
    }

    @Test
    @DisplayName("내 포트폴리오 목록 조회")
    void getMyPortfolios_Success() {
        // given
        Long userId = 1L;
        given(portfolioRepository.findAllByUserId(userId)).willReturn(List.of(
                Portfolio.builder().userId(userId).name("P1").build(),
                Portfolio.builder().userId(userId).name("P2").build()));

        // when
        List<PortfolioResponse> responses = portfolioService.getMyPortfolios(userId);

        // then
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).name()).isEqualTo("P1");
    }
}
