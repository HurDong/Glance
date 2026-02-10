package com.glance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class GlanceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GlanceApplication.class, args);
    }

}
