package com.parkinglot.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLotRequest(
    @NotBlank @Size(max = 100) String name,
    @Valid GridRequest grid
) {
}
