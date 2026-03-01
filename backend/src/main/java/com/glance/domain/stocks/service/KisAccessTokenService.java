package com.glance.domain.stocks.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.stocks.config.KisProperties;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisAccessTokenService {

    private final KisProperties kisProperties;
    private String accessToken;
    private LocalDateTime expiryDate;
    private String approvalKey;

    public synchronized String getAccessToken() {
        if (accessToken != null && expiryDate != null && expiryDate.isAfter(LocalDateTime.now().plusMinutes(10))) {
            return accessToken;
        }

        log.info("🔑 Requesting new KIS Access Token...");
        RestClient restClient = RestClient.create();

        try {
            KisTokenResponse response = restClient.post()
                    .uri(kisProperties.getUrl() + "/oauth2/tokenP")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "grant_type", "client_credentials",
                            "appkey", kisProperties.getAppKey(),
                            "appsecret", kisProperties.getAppSecret()))
                    .retrieve()
                    .body(KisTokenResponse.class);

            if (response == null || response.getAccessToken() == null) {
                throw new BusinessException("KIS 토큰 발급 실패", ErrorCode.INTERNAL_SERVER_ERROR);
            }

            this.accessToken = response.getAccessToken();
            // 보통 24시간 유효하지만 안전하게 설정
            this.expiryDate = LocalDateTime.now().plusSeconds(response.getExpiresIn());
            log.info("✅ KIS Access Token issued. Expires at: {}", expiryDate);
            return accessToken;
        } catch (Exception e) {
            log.error("Failed to get KIS token", e);
            throw new BusinessException("KIS API 연결 실패", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    public synchronized String getApprovalKey() {
        if (this.approvalKey != null) {
            return this.approvalKey;
        }

        log.info("🔑 Requesting KIS WebSocket Approval Key...");
        RestClient restClient = RestClient.create();

        try {
            Map<String, Object> response = restClient.post()
                    .uri(kisProperties.getUrl() + "/oauth2/Approval")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "grant_type", "client_credentials",
                            "appkey", kisProperties.getAppKey(),
                            "secretkey", kisProperties.getAppSecret()))
                    .retrieve()
                    .body(Map.class);

            if (response == null || !response.containsKey("approval_key")) {
                throw new BusinessException("KIS Approval Key 발급 실패", ErrorCode.INTERNAL_SERVER_ERROR);
            }

            this.approvalKey = (String) response.get("approval_key");
            return this.approvalKey;
        } catch (Exception e) {
            log.error("Failed to get KIS Approval Key", e);
            throw new BusinessException("KIS WebSocket 인증 실패", ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Getter
    private static class KisTokenResponse {
        @JsonProperty("access_token")
        private String accessToken;
        @JsonProperty("token_type")
        private String tokenType;
        @JsonProperty("expires_in")
        private Integer expiresIn;
    }
}
