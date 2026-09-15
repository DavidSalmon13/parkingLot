package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSpotRequest(
    @NotBlank @Size(max = 20) String label,
    @NotBlank String row,
    @NotNull Integer position
) {
}
