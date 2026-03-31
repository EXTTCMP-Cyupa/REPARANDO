package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.ProfessionalProfile;
import com.reparando.platform.domain.port.in.MarketplaceUseCase;
import com.reparando.platform.domain.port.out.ProfessionalProfileRepositoryPort;
import com.reparando.platform.domain.port.out.WorkerAccountRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class MarketplaceService implements MarketplaceUseCase {

    private final ProfessionalProfileRepositoryPort profileRepository;
    private final WorkerAccountRepositoryPort workerAccountRepository;

    public MarketplaceService(
        ProfessionalProfileRepositoryPort profileRepository,
        WorkerAccountRepositoryPort workerAccountRepository
    ) {
        this.profileRepository = profileRepository;
        this.workerAccountRepository = workerAccountRepository;
    }

    @Override
    public Flux<ProfessionalProfile> search(String category, Double minRating, Double nearLat, Double nearLng, Double maxKm) {
        return profileRepository.findAll()
            .flatMap(profile -> workerAccountRepository.findWorkerById(profile.workerId())
                .filter(worker -> !worker.blocked())
                .map(worker -> profile)
                .switchIfEmpty(Mono.empty()))
            .filter(profile -> category == null || profile.category().equalsIgnoreCase(category))
            .filter(profile -> minRating == null || profile.rating() >= minRating)
            .filter(profile -> {
                if (nearLat == null || nearLng == null || maxKm == null) {
                    return true;
                }
                double distance = haversineKm(nearLat, nearLng, profile.latitude(), profile.longitude());
                return distance <= maxKm;
            });
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }
}
