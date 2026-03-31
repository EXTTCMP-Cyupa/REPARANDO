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
class BiddingFlowE2ETest {

    private static final UUID WORKER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CLIENT_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

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
    void shouldPublishNeedSubmitBidSelectAndChargeLead() {
        String clientToken = "Bearer " + login("client@reparando.app", "123456").accessToken();
        String workerToken = "Bearer " + login("worker@reparando.app", "123456").accessToken();

        String publishNeedBody = """
            {
              "clientId": "33333333-3333-3333-3333-333333333333",
              "title": "Instalacion tablero",
              "description": "Necesito instalar tablero electrico en oficina",
              "category": "ELECTRICISTA"
            }
            """;

        ServiceNeedResponse need = webTestClient.post()
            .uri("/api/v1/bidding/needs")
            .header("Authorization", clientToken)
            .bodyValue(publishNeedBody)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(ServiceNeedResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(need).isNotNull();
        assertThat(need.clientId()).isEqualTo(CLIENT_ID);

        String submitBidBody = """
            {
              "needId": "%s",
              "workerId": "11111111-1111-1111-1111-111111111111",
              "laborCost": 120.00,
              "summary": "Incluye materiales menores"
            }
            """.formatted(need.id());

        BidProposalResponse bid = webTestClient.post()
            .uri("/api/v1/bidding/bids")
            .header("Authorization", workerToken)
            .bodyValue(submitBidBody)
            .exchange()
            .expectStatus().isCreated()
            .expectBody(BidProposalResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(bid).isNotNull();
        assertThat(bid.workerId()).isEqualTo(WORKER_ID);
        assertThat(bid.needId()).isEqualTo(need.id());

        List<BidProposalResponse> bids = webTestClient.get()
            .uri("/api/v1/bidding/needs/{needId}/bids", need.id())
            .header("Authorization", clientToken)
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(BidProposalResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(bids).isNotNull();
        assertThat(bids).extracting(BidProposalResponse::id).contains(bid.id());

        String selectBidBody = """
            {
              "bidId": "%s",
              "clientId": "33333333-3333-3333-3333-333333333333"
            }
            """.formatted(bid.id());

        BidProposalResponse selected = webTestClient.post()
            .uri("/api/v1/bidding/needs/{needId}/select", need.id())
            .header("Authorization", clientToken)
            .bodyValue(selectBidBody)
            .exchange()
            .expectStatus().isOk()
            .expectBody(BidProposalResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(selected).isNotNull();
        assertThat(selected.id()).isEqualTo(bid.id());

        WorkerAccountResponse account = webTestClient.get()
            .uri("/api/v1/finance/workers/{workerId}/account", WORKER_ID)
            .header("Authorization", workerToken)
            .exchange()
            .expectStatus().isOk()
            .expectBody(WorkerAccountResponse.class)
            .returnResult()
            .getResponseBody();

        assertThat(account).isNotNull();
        assertThat(account.balance()).isEqualByComparingTo(new BigDecimal("-1.50"));
        assertThat(account.blocked()).isFalse();
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

    private record ServiceNeedResponse(
        UUID id,
        UUID clientId,
        String title,
        String description,
        String category,
        String createdAt
    ) {
    }

    private record BidProposalResponse(
        UUID id,
        UUID needId,
        UUID workerId,
        BigDecimal laborCost,
        String summary,
        String createdAt
    ) {
    }

    private record WorkerAccountResponse(
        UUID id,
        String fullName,
        String email,
        BigDecimal balance,
        boolean blocked
    ) {
    }
}
