package com.hirehub.test;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasKey;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Health, metrics, API documentation and request ids. */
class OperationsIT extends ApiTestSupport {

    @Test
    void healthAndItsProbesArePublic() throws Exception {
        mockMvc.perform(get("/actuator/health").with(fromIp("203.0.113.9")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components", hasKey("db")))
                .andExpect(jsonPath("$.components", hasKey("aiService")))
                .andExpect(jsonPath("$.components.db.details").doesNotExist());
        mockMvc.perform(get("/actuator/health/readiness").with(fromIp("203.0.113.9"))).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/health/liveness").with(fromIp("203.0.113.9"))).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/info").with(fromIp("203.0.113.9"))).andExpect(status().isOk());
    }

    @Test
    void metricsAreOnlyForThisMachineOrAPrivateNetwork() throws Exception {
        mockMvc.perform(get("/actuator/metrics").with(fromIp("127.0.0.1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.names").isArray());
        mockMvc.perform(get("/actuator/metrics").with(fromIp("172.18.0.5"))).andExpect(status().isOk());
        int outside = mockMvc.perform(get("/actuator/metrics").with(fromIp("203.0.113.9")))
                .andReturn().getResponse().getStatus();
        assertThat(outside).isIn(401, 403);
    }

    @Test
    void theApiIsDocumentedInOpenApi() throws Exception {
        String doc = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("HireHub API"))
                .andReturn().getResponse().getContentAsString();
        assertThat((java.util.Map<String, Object>) JsonPath.read(doc, "$.paths"))
                .containsKeys("/api/auth/login", "/api/auth/register", "/api/joboffers", "/api/applications");
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }

    @Test
    void everyAnswerHasARequestIdAndAnErrorUsesItAsCorrelationId() throws Exception {
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().exists("X-Request-Id"))
                .andReturn().getResponse().getContentAsString();
        String requestId = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-Id", "proxy-id-12345")
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(header().string("X-Request-Id", "proxy-id-12345"))
                .andExpect(jsonPath("$.correlationId").value("proxy-id-12345"))
                .andReturn().getResponse().getHeader("X-Request-Id");
        assertThat(requestId).isEqualTo("proxy-id-12345");
        assertThat((String) JsonPath.read(body, "$.correlationId")).isNotBlank();

        // A header that doesn't look like an id is replaced, not echoed back.
        mockMvc.perform(get("/api/health").header("X-Request-Id", "<script>"))
                .andExpect(header().string("X-Request-Id", org.hamcrest.Matchers.matchesPattern("[0-9a-f-]{36}")));
    }

    @Test
    void anUnauthenticatedErrorAlsoCarriesTheRequestId() throws Exception {
        mockMvc.perform(get("/api/users/me").header("X-Request-Id", "trace-me-0001"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.correlationId").value("trace-me-0001"));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }
}
