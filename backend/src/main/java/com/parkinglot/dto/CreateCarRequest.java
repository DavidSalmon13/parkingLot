package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateCarRequest(
    @NotBlank(message = "חובה למלא") @Size(max = 50, message = "עד 50 תווים") String chassisNumber,
    @NotBlank(message = "חובה למלא") @Size(max = 20, message = "עד 20 תווים") String licensePlateNumber,
    @NotBlank(message = "חובה למלא") @Size(max = 50, message = "עד 50 תווים") String carType,
    @Size(max = 100, message = "עד 100 תווים") String clientName,
    LocalDate deliveryDate
) {
}
