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
class FinancialFlowE2ETest {

    private static final UUID WORKER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CLIENT_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID ADMIN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

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
    void shouldBlockOnCreditLimitAndUnblockAfterApprovedDeposit() {
        String workerToken = "Bearer " + login("worker@reparando.app", "123456").accessToken();
        String adminToken = "Bearer " + login("admin@reparando.app", "123456").accessToken();

        WorkerAccountResponse firstCharge = chargeLead(workerToken);
        assertThat(firstCharge.blocked()).isFalse();
        assertThat(firstCharge.balance()).isEqualByComparingTo(new BigDecimal("-1.50"));

        WorkerAccountResponse secondCharge = chargeLead(workerToken);
        assertThat(secondCharge.blocked()).isTrue();
        assertThat(secondCharge.balance()).isEqualByComparingTo(new BigDecimal("-3.00"));

        ApiErrorResponse blockedError = chargeLeadExpectConflict(workerToken);
        assertThat(blockedError.code()).isEqualTo("CONFLICT");
        assertThat(blockedError.message()).contains("blocked");

        String submitDepositBody = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "amount": 2.00,
              "imagePath": "uploads/e2e-deposit.jpg"
            }
            """;

        DepositReceiptResponse createdDeposit = webTestClient.post()
            .uri("/api/v1/finance/deposit")
            .header("Authorization", workerToken)
            .bodyValue(submitDepositBody)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(DepositReceiptResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(createdDeposit).isNotNull();
        assertThat(createdDeposit.status()).isEqualTo("PENDING");

        List<DepositReceiptResponse> pending = webTestClient.get()
            .uri("/api/v1/finance/deposit/pending")
            .header("Authorization", adminToken)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(DepositReceiptResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(pending).isNotNull();
        assertThat(pending).extracting(DepositReceiptResponse::id).contains(createdDeposit.id());

        String approveBody = """
            {
              "adminId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
            }
            """;

        DepositReceiptResponse approved = webTestClient.post()
            .uri("/api/v1/finance/deposit/{depositId}/approve", createdDeposit.id())
            .header("Authorization", adminToken)
            .bodyValue(approveBody)
            .exchange()
            .expectStatus().isOk()
            .expectBody(DepositReceiptResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(approved).isNotNull();
        assertThat(approved.status()).isEqualTo("APPROVED");
        assertThat(approved.reviewedBy()).isEqualTo(ADMIN_ID);

        WorkerAccountResponse accountAfterApproval = webTestClient.get()
            .uri("/api/v1/finance/workers/{workerId}/account", WORKER_ID)
            .header("Authorization", workerToken)
            .exchange()
            .expectStatus().isOk()
            .expectBody(WorkerAccountResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(accountAfterApproval).isNotNull();
        assertThat(accountAfterApproval.balance()).isEqualByComparingTo(new BigDecimal("-1.00"));
        assertThat(accountAfterApproval.blocked()).isFalse();
    }

    private WorkerAccountResponse chargeLead(String authHeader) {
        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "clientId": "33333333-3333-3333-3333-333333333333",
              "source": "E2E_TEST"
            }
            """;

        WorkerAccountResponse response = webTestClient.post()
            .uri("/api/v1/finance/lead/charge")
            .header("Authorization", authHeader)
            .bodyValue(body)
            .exchange()
            .expectStatus().isOk()
            .expectBody(WorkerAccountResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(response).isNotNull();
        return response;
    }

    private ApiErrorResponse chargeLeadExpectConflict(String authHeader) {
        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "clientId": "33333333-3333-3333-3333-333333333333",
              "source": "E2E_TEST"
            }
            """;

        ApiErrorResponse response = webTestClient.post()
            .uri("/api/v1/finance/lead/charge")
            .header("Authorization", authHeader)
            .bodyValue(body)
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody(ApiErrorResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(response).isNotNull();
        return response;
    }

    private AuthResponse login(String email, String password) {
        String body = """
            {
              "email": "%s",
              "password": "%s"
            }
            """.formatted(email, password);

        AuthResponse auth = webTestClient.post()
            .uri("/api/v1/auth/login")
            .bodyValue(body)
            .exchange()
            .expectStatus().isOk()
            .expectBody(AuthResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(auth).isNotNull();
        return auth;
    }

    private record AuthResponse(String accessToken, String role, UUID userId) {
    }

    private record WorkerAccountResponse(
        UUID id,
        String fullName,
        String email,
        BigDecimal balance,
        boolean blocked
    ) {
    }

    private record DepositReceiptResponse(
        UUID id,
        UUID workerId,
        BigDecimal amount,
        String imagePath,
        String status,
        String createdAt,
        UUID reviewedBy
    ) {
    }

    private record ApiErrorResponse(String code, String message, String timestamp) {
    }
}
