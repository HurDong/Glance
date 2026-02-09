package com.glance.domain.stocks.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "kis")
@Getter
@Setter
public class KisProperties {
    private String appKey;
    private String appSecret;
    private String accountCode;
    private String productCode;
    private String mode; // VIRTUAL or PROD
    private String url;
    private String wsUrl;
}
