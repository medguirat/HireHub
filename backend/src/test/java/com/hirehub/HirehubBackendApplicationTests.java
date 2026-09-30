package com.hirehub;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// "test" profile: like every other test, it uses hirehub_test and never the dev database.
@SpringBootTest
@ActiveProfiles("test")
class HirehubBackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
