package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLotRequest(@NotBlank(message = "חובה למלא") @Size(max = 100, message = "עד 100 תווים") String name) {
}
