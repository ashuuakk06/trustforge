package com.trustforge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "trustforge")
public record TrustForgeProperties(String jwtSecret, long accessTokenMinutes, long refreshTokenDays, String corsOrigin) {}
