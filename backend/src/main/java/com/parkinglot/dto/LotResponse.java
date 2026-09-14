package com.parkinglot.dto;

import java.util.List;
import java.util.UUID;

public record LotResponse(UUID id, String name, List<String> rowLabels, List<SpotResponse> spots) {
}
