package com.parkinglot.dto;

import java.time.Instant;
import java.time.LocalDate;

public record CarDetailResponse(
    String chassisNumber,
    String licensePlateNumber,
    String carType,
    String clientName,
    LocalDate deliveryDate,
    CurrentLocation currentLocation
) {
    // assignedAt isn't in spec §3.10's literal response shape, but §5.6's
    // detail panel needs an assigned-since timestamp — added here rather
    // than fabricated on the frontend.
    public record CurrentLocation(String lotName, String spotLabel, Instant assignedAt) {
    }
}
