package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateCarRequest(
    @NotBlank @Size(max = 20) String licensePlateNumber,
    @NotBlank @Size(max = 50) String carType,
    @NotBlank @Size(max = 100) String clientName,
    LocalDate deliveryDate
) {
}
