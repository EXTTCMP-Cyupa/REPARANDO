package com.reparando.platform.infrastructure.adapter.in.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class WorkWorkflowE2ETest {

    private static final UUID WORK_ORDER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID WORKER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("reparando")
        .withUsername("reparando")
        .withPassword("reparando");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> String.format(
            "r2dbc:postgresql://%s:%d/%s",
            POSTGRES.getHost(),
            POSTGRES.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT),
            POSTGRES.getDatabaseName()
        ));
        registry.add("spring.r2dbc.username", POSTGRES::getUsername);
        registry.add("spring.r2dbc.password", POSTGRES::getPassword);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
        registry.add("app.security.jwt.secret", () -> "01234567890123456789012345678901");
    }

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void shouldLoginAndManageMaterialsEndToEnd() {
        webTestClient.get()
            .uri("/api/v1/workflow/{workOrderId}/materials", WORK_ORDER_ID)
            .exchange()
            .expectStatus().isUnauthorized();

        AuthResponse auth = loginAsWorker();
        String authHeader = "Bearer " + auth.accessToken();

        String invalidBody = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "Cable invalid",
              "quantity": 1,
              "unitCost": 0
            }
            """;

        webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", WORK_ORDER_ID)
            .header("Authorization", authHeader)
            .bodyValue(invalidBody)
            .exchange()
            .expectStatus().isBadRequest();

        List<MaterialResponse> before = listMaterials(authHeader);
        BigDecimal totalBefore = totalCost(before);

        String uniqueName = "Cable E2E " + UUID.randomUUID();
        String createBody = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "%s",
              "quantity": 2,
              "unitCost": 19.75
            }
            """.formatted(uniqueName);

        MaterialResponse created = webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", WORK_ORDER_ID)
            .header("Authorization", authHeader)
            .bodyValue(createBody)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(MaterialResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(created).isNotNull();
        assertThat(created.name()).isEqualTo(uniqueName);
        assertThat(created.workOrderId()).isEqualTo(WORK_ORDER_ID);
        assertThat(created.workerId()).isEqualTo(WORKER_ID);

        List<MaterialResponse> after = listMaterials(authHeader);
        BigDecimal totalAfter = totalCost(after);

        assertThat(after).extracting(MaterialResponse::id).contains(created.id());
        assertThat(totalAfter).isEqualByComparingTo(totalBefore.add(new BigDecimal("39.50")));

        String moveToQuotedBody = """
            {
              "newStatus": "COTIZADO"
            }
            """;

        WorkOrderResponse moved = webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/status", WORK_ORDER_ID)
            .header("Authorization", authHeader)
            .bodyValue(moveToQuotedBody)
            .exchange()
            .expectStatus().isOk()
            .expectBody(WorkOrderResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(moved).isNotNull();
        assertThat(moved.id()).isEqualTo(WORK_ORDER_ID);
        assertThat(moved.status()).isEqualTo("COTIZADO");

        String invalidMoveBody = """
            {
              "newStatus": "DIAGNOSTICO"
            }
            """;

        ApiErrorResponse conflict = webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/status", WORK_ORDER_ID)
            .header("Authorization", authHeader)
            .bodyValue(invalidMoveBody)
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody(ApiErrorResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(conflict).isNotNull();
        assertThat(conflict.code()).isEqualTo("CONFLICT");
        assertThat(conflict.message()).contains("Invalid status transition");
    }

    private AuthResponse loginAsWorker() {
        String loginBody = """
            {
              "email": "worker@reparando.app",
              "password": "123456"
            }
            """;

        AuthResponse auth = webTestClient.post()
            .uri("/api/v1/auth/login")
            .bodyValue(loginBody)
            .exchange()
            .expectStatus().isOk()
            .expectBody(AuthResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(auth).isNotNull();
        assertThat(auth.role()).isEqualTo("WORKER");
        assertThat(auth.userId()).isEqualTo(WORKER_ID);
        assertThat(auth.accessToken()).isNotBlank();
        return auth;
    }

    private List<MaterialResponse> listMaterials(String authHeader) {
        List<MaterialResponse> materials = webTestClient.get()
            .uri("/api/v1/workflow/{workOrderId}/materials", WORK_ORDER_ID)
            .header("Authorization", authHeader)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(MaterialResponse.class)
            .returnResult()
            .getResponseBody();

        return materials == null ? List.of() : materials;
    }

    private BigDecimal totalCost(List<MaterialResponse> materials) {
        return materials.stream()
            .map(material -> material.unitCost().multiply(BigDecimal.valueOf(material.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private record AuthResponse(String accessToken, String role, UUID userId) {
    }

    private record MaterialResponse(
        UUID id,
        UUID workOrderId,
        UUID workerId,
        String name,
        Integer quantity,
        BigDecimal unitCost
    ) {
    }

    private record WorkOrderResponse(
        UUID id,
        UUID clientId,
        UUID workerId,
        String status
    ) {
    }

    private record ApiErrorResponse(String code, String message, String timestamp) {
    }
}
