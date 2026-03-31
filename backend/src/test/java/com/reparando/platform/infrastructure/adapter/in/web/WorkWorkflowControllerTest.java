package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import com.reparando.platform.infrastructure.config.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@WebFluxTest(
    controllers = WorkWorkflowController.class,
    excludeAutoConfiguration = {
        ReactiveSecurityAutoConfiguration.class,
        ReactiveUserDetailsServiceAutoConfiguration.class
    }
)
@Import(ApiExceptionHandler.class)
class WorkWorkflowControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private WorkWorkflowUseCase workWorkflowUseCase;

    @MockBean
    private JwtService jwtService;

    @Test
    void shouldCreateMaterialAndReturnCreatedResponse() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID workerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        WorkMaterial material = new WorkMaterial(
            UUID.fromString("44444444-4444-4444-4444-444444444444"),
            workOrderId,
            workerId,
            "Cable AWG 12",
            2,
            new BigDecimal("19.75"),
            OffsetDateTime.parse("2026-03-30T10:00:00Z")
        );

        when(workWorkflowUseCase.addMaterial(
            eq(workOrderId),
            eq(workerId),
            eq("Cable AWG 12"),
            eq(2),
            eq(new BigDecimal("19.75"))
        )).thenReturn(Mono.just(material));

        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "Cable AWG 12",
              "quantity": 2,
              "unitCost": 19.75
            }
            """;

        webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", workOrderId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .exchange()
            .expectStatus().isCreated()
            .expectBody()
            .jsonPath("$.id").isEqualTo("44444444-4444-4444-4444-444444444444")
            .jsonPath("$.workOrderId").isEqualTo("22222222-2222-2222-2222-222222222222")
            .jsonPath("$.name").isEqualTo("Cable AWG 12")
            .jsonPath("$.quantity").isEqualTo(2)
            .jsonPath("$.unitCost").isEqualTo(19.75);

        verify(workWorkflowUseCase).addMaterial(
            eq(workOrderId),
            eq(workerId),
            eq("Cable AWG 12"),
            eq(2),
            eq(new BigDecimal("19.75"))
        );
    }

    @Test
    void shouldReturnBadRequestWhenQuantityIsInvalid() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");

        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "Cable AWG 12",
              "quantity": 0,
              "unitCost": 19.75
            }
            """;

        webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", workOrderId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .exchange()
            .expectStatus().isBadRequest();

        verifyNoInteractions(workWorkflowUseCase);
    }

    @Test
    void shouldReturnBadRequestWhenNameIsBlank() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");

        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "   ",
              "quantity": 1,
              "unitCost": 19.75
            }
            """;

        webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", workOrderId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .exchange()
            .expectStatus().isBadRequest();

        verifyNoInteractions(workWorkflowUseCase);
    }

    @Test
    void shouldReturnBadRequestWhenUnitCostIsInvalid() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");

        String body = """
            {
              "workerId": "11111111-1111-1111-1111-111111111111",
              "name": "Cable AWG 12",
              "quantity": 1,
              "unitCost": 0
            }
            """;

        webTestClient.post()
            .uri("/api/v1/workflow/{workOrderId}/materials", workOrderId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .exchange()
            .expectStatus().isBadRequest();

        verifyNoInteractions(workWorkflowUseCase);
    }

    @Test
    void shouldListMaterialsByOrderId() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID workerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        WorkMaterial material = new WorkMaterial(
            UUID.fromString("44444444-4444-4444-4444-444444444444"),
            workOrderId,
            workerId,
            "Tornillo",
            10,
            new BigDecimal("0.50"),
            OffsetDateTime.parse("2026-03-30T10:00:00Z")
        );

        when(workWorkflowUseCase.listMaterials(workOrderId)).thenReturn(Flux.just(material));

        webTestClient.get()
            .uri("/api/v1/workflow/{workOrderId}/materials", workOrderId)
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$[0].id").isEqualTo("44444444-4444-4444-4444-444444444444")
            .jsonPath("$[0].name").isEqualTo("Tornillo")
            .jsonPath("$[0].quantity").isEqualTo(10)
            .jsonPath("$[0].unitCost").isEqualTo(0.50);

        verify(workWorkflowUseCase).listMaterials(workOrderId);
    }
}
