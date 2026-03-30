package com.reparando.platform.domain.model;

import java.util.Set;
import java.util.UUID;

public record WorkOrder(
    UUID id,
    UUID clientId,
    UUID workerId,
    WorkStatus status
) {

    public WorkOrder moveTo(WorkStatus newStatus) {
        Set<WorkStatus> allowed = switch (status) {
            case DIAGNOSTICO -> Set.of(WorkStatus.COTIZADO);
            case COTIZADO -> Set.of(WorkStatus.EN_PROCESO);
            case EN_PROCESO -> Set.of(WorkStatus.FINALIZADO);
            case FINALIZADO -> Set.of();
        };

        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException("Invalid status transition: " + status + " -> " + newStatus);
        }

        return new WorkOrder(id, clientId, workerId, newStatus);
    }
}
