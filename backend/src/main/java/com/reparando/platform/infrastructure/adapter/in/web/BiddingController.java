package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import com.reparando.platform.domain.port.in.BiddingUseCase;
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
        return biddingUseCase.publishNeed(request.clientId(), request.title(), request.description(), request.category());
    }

    @PostMapping("/bids")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<BidProposal> submitBid(@RequestBody SubmitBidRequest request) {
        return biddingUseCase.submitBid(request.needId(), request.workerId(), request.laborCost(), request.summary());
    }

    @GetMapping("/needs")
    @ResponseStatus(HttpStatus.OK)
    public Flux<ServiceNeed> listNeeds(@RequestParam(required = false) UUID clientId) {
        if (clientId != null) {
            return biddingUseCase.listNeedsByClient(clientId);
        }
        return biddingUseCase.listNeeds();
    }

    @GetMapping("/needs/{needId}/bids")
    @ResponseStatus(HttpStatus.OK)
    public Flux<BidProposal> listBids(@PathVariable UUID needId) {
        return biddingUseCase.listBids(needId);
    }

    @PostMapping("/needs/{needId}/select")
    @ResponseStatus(HttpStatus.OK)
    public Mono<BidProposal> selectBid(@PathVariable UUID needId, @RequestBody SelectBidRequest request) {
        return biddingUseCase.selectBid(needId, request.bidId(), request.clientId());
    }

    public record PublishNeedRequest(
        @NotNull UUID clientId,
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String category
    ) {
    }

    public record SubmitBidRequest(
        @NotNull UUID needId,
        @NotNull UUID workerId,
        @NotNull BigDecimal laborCost,
        @NotBlank String summary
    ) {
    }

    public record SelectBidRequest(
        @NotNull UUID bidId,
        @NotNull UUID clientId
    ) {
    }
}
