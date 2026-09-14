package com.parkinglot.dto;

public record CarDetailResponse(
    String id,
    String ownerName,
    String employeeId,
    String phoneNumber,
    String notes,
    CurrentLocation currentLocation
) {
    public record CurrentLocation(String lotName, String spotLabel) {
    }
}
