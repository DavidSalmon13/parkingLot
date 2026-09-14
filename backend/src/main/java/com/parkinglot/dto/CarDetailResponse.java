package com.parkinglot.dto;

import java.time.Instant;

public record CarDetailResponse(
    String id,
    String ownerName,
    String employeeId,
    String phoneNumber,
    String notes,
    CurrentLocation currentLocation
) {
    // assignedAt isn't in spec §3.10's literal response shape, but §5.6's
    // detail panel needs an assigned-since timestamp — added here rather
    // than fabricated on the frontend.
    public record CurrentLocation(String lotName, String spotLabel, Instant assignedAt) {
    }
}
