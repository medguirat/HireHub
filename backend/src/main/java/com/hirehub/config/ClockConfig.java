package com.hirehub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class ClockConfig {

    /** The current time, injectable so time-based rules (e.g. link expiry) can be tested. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
