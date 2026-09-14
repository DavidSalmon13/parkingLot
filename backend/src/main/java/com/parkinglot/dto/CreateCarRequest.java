package com.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCarRequest(
    @NotBlank @Size(min = 6, max = 6) String id,
    @NotBlank @Size(max = 100) String ownerName,
    @NotBlank @Size(max = 50) String employeeId,
    @Size(max = 30) String phoneNumber,
    @Size(max = 500) String notes
) {
}
