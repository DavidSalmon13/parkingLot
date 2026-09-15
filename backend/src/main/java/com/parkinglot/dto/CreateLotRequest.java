package com.parkinglot.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLotRequest(
    @NotBlank(message = "חובה למלא") @Size(max = 100, message = "עד 100 תווים") String name,
    @Valid GridRequest grid
) {
}
