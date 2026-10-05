package com.hirehub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The API description served at /v3/api-docs and shown by Swagger UI (/swagger-ui.html). */
@Configuration
public class OpenApiConfig {

    static final String SESSION = "session";

    @Bean
    public OpenAPI hireHubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("HireHub API")
                        .version("v1")
                        .description("""
                                Recruitment platform API: accounts, job offers, applications, CV matching, \
                                company profiles and notifications.

                                Errors always have the same shape: `{ code, message, correlationId, fieldErrors? }`. \
                                `correlationId` is also the `X-Request-Id` header and appears in the server logs.

                                Sign in with `POST /api/auth/login` (or sign up), then use the returned token: \
                                **Authorize** → paste the token."""))
                .components(new Components().addSecuritySchemes(SESSION, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                        .description("The token returned by login or signup.")))
                .addSecurityItem(new SecurityRequirement().addList(SESSION));
    }
}
