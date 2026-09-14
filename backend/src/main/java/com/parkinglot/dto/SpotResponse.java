package com.parkinglot.dto;

import java.util.UUID;

public record SpotResponse(UUID id, String label, String row, int position, String status, CarSummaryResponse car) {
}
