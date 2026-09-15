package com.parkinglot.dto;

// Intentionally leaves clientName out — never add it here, so GET /api/lots
// never leaks client PII to the always-visible dashboard (spec §9.5).
public record CarSummaryResponse(String chassisNumber, String licensePlateNumber, String carType) {
}
