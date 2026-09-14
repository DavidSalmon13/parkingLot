package com.parkinglot.dto;

// Intentionally just {id, ownerName} — never add phoneNumber/notes/employeeId
// here, so GET /api/lots never leaks full PII to the always-visible dashboard (spec §9.5).
public record CarSummaryResponse(String id, String ownerName) {
}
