package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.ProfessionalProfile;
import com.reparando.platform.domain.port.in.MarketplaceUseCase;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceController {

    private final MarketplaceUseCase marketplaceUseCase;

    public MarketplaceController(MarketplaceUseCase marketplaceUseCase) {
        this.marketplaceUseCase = marketplaceUseCase;
    }

    @GetMapping("/professionals")
    @ResponseStatus(HttpStatus.OK)
    public Flux<ProfessionalProfile> search(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Double minRating,
        @RequestParam(required = false) Double nearLat,
        @RequestParam(required = false) Double nearLng,
        @RequestParam(required = false) Double maxKm
    ) {
        return marketplaceUseCase.search(category, minRating, nearLat, nearLng, maxKm);
    }
}
