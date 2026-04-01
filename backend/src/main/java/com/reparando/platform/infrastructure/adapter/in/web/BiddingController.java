package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import com.reparando.platform.domain.port.in.BiddingUseCase;
import com.reparando.platform.infrastructure.config.JwtPrincipal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bidding")
@Validated
public class BiddingController {

    private final BiddingUseCase biddingUseCase;

    public BiddingController(BiddingUseCase biddingUseCase) {
        this.biddingUseCase = biddingUseCase;
    }

    @PostMapping("/needs")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ServiceNeed> publishNeed(@RequestBody PublishNeedRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.hasRole(currentUser, "CLIENT") && !CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only clients can publish service needs"));
                }

                UUID effectiveClientId = request.clientId() == null ? currentUser.userId() : request.clientId();
                return CurrentUserContext.requireSelfOrAdmin(currentUser, effectiveClientId)
                    .then(biddingUseCase.publishNeed(effectiveClientId, request.title(), request.description(), request.category()));
            });
    }

    @PostMapping("/bids")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<BidProposal> submitBid(@RequestBody SubmitBidRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.hasRole(currentUser, "WORKER") && !CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only workers can submit bids"));
                }

                UUID effectiveWorkerId = request.workerId() == null ? currentUser.userId() : request.workerId();
                return CurrentUserContext.requireSelfOrAdmin(currentUser, effectiveWorkerId)
                    .then(biddingUseCase.submitBid(request.needId(), effectiveWorkerId, request.laborCost(), request.summary()));
            });
    }

    @GetMapping("/needs")
    @ResponseStatus(HttpStatus.OK)
    public Flux<ServiceNeed> listNeeds(@RequestParam(required = false) UUID clientId) {
        return CurrentUserContext.require()
            .flatMapMany(currentUser -> {
                if (clientId != null) {
                    return CurrentUserContext.requireSelfOrAdmin(currentUser, clientId)
                        .thenMany(biddingUseCase.listNeedsByClient(clientId));
                }

                if (CurrentUserContext.hasRole(currentUser, "CLIENT")) {
                    return biddingUseCase.listNeedsByClient(currentUser.userId());
                }

                return biddingUseCase.listNeeds();
            });
    }

    @GetMapping("/needs/{needId}/bids")
    @ResponseStatus(HttpStatus.OK)
    public Flux<BidProposal> listBids(@PathVariable UUID needId) {
        return biddingUseCase.listBids(needId);
    }

    @PostMapping("/needs/{needId}/select")
    @ResponseStatus(HttpStatus.OK)
    public Mono<BidProposal> selectBid(@PathVariable UUID needId, @RequestBody SelectBidRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.hasRole(currentUser, "CLIENT") && !CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only clients can select bids"));
                }

                UUID effectiveClientId = request.clientId() == null ? currentUser.userId() : request.clientId();
                return CurrentUserContext.requireSelfOrAdmin(currentUser, effectiveClientId)
                    .then(biddingUseCase.selectBid(needId, request.bidId(), effectiveClientId));
            });
    }

    public record PublishNeedRequest(
        UUID clientId,
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String category
    ) {
    }

    public record SubmitBidRequest(
        @NotNull UUID needId,
        UUID workerId,
        @NotNull BigDecimal laborCost,
        @NotBlank String summary
    ) {
    }

    public record SelectBidRequest(
        @NotNull UUID bidId,
        UUID clientId
    ) {
    }
}
