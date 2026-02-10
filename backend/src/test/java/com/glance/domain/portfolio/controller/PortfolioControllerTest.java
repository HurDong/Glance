package com.glance.domain.portfolio.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glance.domain.portfolio.dto.PortfolioRequest;
import com.glance.domain.portfolio.dto.PortfolioResponse;
import com.glance.domain.portfolio.service.PortfolioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PortfolioController.class)
class PortfolioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PortfolioService portfolioService;

    @Test
    @DisplayName("포트폴리오 생성 API 테스트")
    void createPortfolio_ApiTest() throws Exception {
        // given
        Long userId = 1L;
        PortfolioRequest request = PortfolioRequest.builder()
                .name("테스트 포트폴리오")
                .isPublic(true)
                .build();

        PortfolioResponse response = PortfolioResponse.builder()
                .id(1L)
                .name("테스트 포트폴리오")
                .build();

        given(portfolioService.createPortfolio(eq(userId), any(PortfolioRequest.class)))
                .willReturn(response);

        // when & then
        mockMvc.perform(post("/api/v1/portfolios")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("테스트 포트폴리오"));
    }

    @Test
    @DisplayName("유효하지 않은 요청(이름 미입력) 시 실패")
    void createPortfolio_Fail_InvalidInput() throws Exception {
        // given
        PortfolioRequest request = PortfolioRequest.builder()
                .name("") // 빈 이름
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/portfolios")
                .header("X-User-Id", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
