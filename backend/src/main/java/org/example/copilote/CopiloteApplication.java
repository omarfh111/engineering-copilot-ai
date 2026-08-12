package org.example.copilote;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CopiloteApplication {

    public static void main(String[] args) {
        SpringApplication.run(CopiloteApplication.class, args);
    }

}
