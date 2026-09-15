package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateSpotRequest(
    @NotBlank(message = "חובה למלא") @Size(max = 20, message = "עד 20 תווים") String label,
    @NotBlank(message = "חובה למלא") String row,
    @NotNull(message = "חובה למלא") Integer position
) {
}
