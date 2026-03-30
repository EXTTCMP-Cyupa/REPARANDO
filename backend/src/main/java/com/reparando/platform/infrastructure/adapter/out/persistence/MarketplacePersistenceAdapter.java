package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.ProfessionalProfile;
import com.reparando.platform.domain.port.out.ProfessionalProfileRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.ProfessionalProfileEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.ProfessionalProfileR2dbcRepository;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.List;

@Component
public class MarketplacePersistenceAdapter implements ProfessionalProfileRepositoryPort {

    private final ProfessionalProfileR2dbcRepository repository;

    public MarketplacePersistenceAdapter(ProfessionalProfileR2dbcRepository repository) {
        this.repository = repository;
    }

    @Override
    public Flux<ProfessionalProfile> findAll() {
        return repository.findAll().map(this::toDomain);
    }

    private ProfessionalProfile toDomain(ProfessionalProfileEntity entity) {
        return new ProfessionalProfile(
            entity.workerId(),
            entity.fullName(),
            entity.category(),
            entity.rating(),
            entity.latitude(),
            entity.longitude(),
            splitPortfolioImages(entity.portfolioImages())
        );
    }

    private List<String> splitPortfolioImages(String rawImages) {
        if (rawImages == null || rawImages.isBlank()) {
            return List.of();
        }
        return Arrays.stream(rawImages.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .toList();
    }
}
