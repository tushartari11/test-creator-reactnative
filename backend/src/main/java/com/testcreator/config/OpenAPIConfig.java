package com.testcreator.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 / Swagger UI Configuration.
 * 
 * <p>
 * Configures SpringDoc OpenAPI to generate comprehensive API documentation
 * with proper security schemes for JWT authentication and detailed server
 * information.
 * 
 * <p>
 * Access Swagger UI at: http://localhost:8080/swagger-ui.html
 * Access OpenAPI JSON at: http://localhost:8080/v3/api-docs
 */
@Configuration
@SecurityScheme(name = "Bearer Authentication", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT", description = "JWT token authentication. Include the JWT token in the Authorization header using the Bearer scheme.")
public class OpenAPIConfig {

    @Value("${app.name:Test Creator}")
    private String appName;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.description:Online examination platform with advanced proctoring and test management capabilities}")
    private String appDescription;

    /**
     * Configures OpenAPI 3.0 documentation.
     *
     * @return OpenAPI Bean with full documentation configuration
     */
    @Bean
    public OpenAPI customOpenAPI() {
        Server devServer = new Server();
        devServer.setUrl("http://localhost:8080");
        devServer.setDescription("Development Server");

        Server prodServer = new Server();
        prodServer.setUrl("https://api.testcreator.com");
        prodServer.setDescription("Production Server");

        Info info = new Info()
                .title(appName)
                .version(appVersion)
                .description(appDescription)
                .license(new License()
                        .name("MIT")
                        .url("https://opensource.org/licenses/MIT"));

        OpenAPI openAPI = new OpenAPI()
                .info(info)
                .servers(List.of(devServer, prodServer))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"));

        return openAPI;
    }
}
