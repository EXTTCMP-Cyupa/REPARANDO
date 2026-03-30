package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("professional_profile")
public record ProfessionalProfileEntity(
    @Id UUID workerId,
    String fullName,
    String category,
    double rating,
    double latitude,
    double longitude,
    String portfolioImages
) {
}
