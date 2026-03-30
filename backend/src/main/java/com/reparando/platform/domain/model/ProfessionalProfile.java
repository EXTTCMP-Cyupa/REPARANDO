package com.reparando.platform.domain.model;

import java.util.List;
import java.util.UUID;

public record ProfessionalProfile(
    UUID workerId,
    String fullName,
    String category,
    double rating,
    double latitude,
    double longitude,
    List<String> portfolioImages
) {
}
