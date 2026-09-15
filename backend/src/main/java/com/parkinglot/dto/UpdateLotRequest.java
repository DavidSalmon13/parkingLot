package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLotRequest(@NotBlank @Size(max = 100) String name) {
}
