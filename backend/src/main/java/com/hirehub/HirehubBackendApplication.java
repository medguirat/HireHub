package com.hirehub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HirehubBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(HirehubBackendApplication.class, args);
    }

}
