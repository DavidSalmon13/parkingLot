package com.parkinglot.dto;

import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(UUID id, String carId, UUID spotId, Instant assignedAt, String lotName, String spotLabel) {
}
