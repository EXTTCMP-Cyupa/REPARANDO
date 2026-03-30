package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.BusinessPolicy;
import com.reparando.platform.domain.port.out.BusinessPolicyRepositoryPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Component
public class BusinessPolicyPersistenceAdapter implements BusinessPolicyRepositoryPort {

    private final DatabaseClient databaseClient;
    private final BigDecimal defaultLeadCost;
    private final BigDecimal defaultTrustCreditLimit;

    public BusinessPolicyPersistenceAdapter(
        DatabaseClient databaseClient,
        @Value("${app.business.lead-cost}") BigDecimal defaultLeadCost,
        @Value("${app.business.trust-credit-limit}") BigDecimal defaultTrustCreditLimit
    ) {
        this.databaseClient = databaseClient;
        this.defaultLeadCost = defaultLeadCost;
        this.defaultTrustCreditLimit = defaultTrustCreditLimit;
    }

    @Override
    public Mono<BusinessPolicy> getCurrent() {
        Mono<BigDecimal> leadCost = queryValue("lead_cost").defaultIfEmpty(defaultLeadCost);
        Mono<BigDecimal> trustLimit = queryValue("trust_credit_limit").defaultIfEmpty(defaultTrustCreditLimit);
        return Mono.zip(leadCost, trustLimit)
            .map(tuple -> new BusinessPolicy(tuple.getT1(), tuple.getT2()));
    }

    @Override
    public Mono<BusinessPolicy> save(BusinessPolicy policy) {
        OffsetDateTime now = OffsetDateTime.now();
        return upsert("lead_cost", policy.leadCost(), now)
            .then(upsert("trust_credit_limit", policy.trustCreditLimit(), now))
            .thenReturn(policy);
    }

    private Mono<BigDecimal> queryValue(String key) {
        return databaseClient.sql("SELECT value FROM business_setting WHERE key = :key")
            .bind("key", key)
            .map((row, metadata) -> new BigDecimal(String.valueOf(row.get("value"))))
            .one();
    }

    private Mono<Void> upsert(String key, BigDecimal value, OffsetDateTime now) {
        return databaseClient.sql("""
                INSERT INTO business_setting(key, value, updated_at)
                VALUES (:key, :value, :updatedAt)
                ON CONFLICT(key) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at
                """)
            .bind("key", key)
            .bind("value", value.toPlainString())
            .bind("updatedAt", now)
            .fetch()
            .rowsUpdated()
            .then();
    }
}
