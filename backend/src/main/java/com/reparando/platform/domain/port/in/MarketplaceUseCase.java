package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.ProfessionalProfile;
import reactor.core.publisher.Flux;

public interface MarketplaceUseCase {
    Flux<ProfessionalProfile> search(String category, Double minRating, Double nearLat, Double nearLng, Double maxKm);
}
