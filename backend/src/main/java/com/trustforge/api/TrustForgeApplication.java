package com.trustforge.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TrustForgeApplication {
    public static void main(String[] args) {
        SpringApplication.run(TrustForgeApplication.class, args);
    }
}
