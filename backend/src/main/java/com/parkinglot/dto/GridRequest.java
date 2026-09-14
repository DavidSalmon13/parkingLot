package com.parkinglot.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GridRequest(
    @NotEmpty @Size(max = 26) List<@NotBlank @Size(max = 10) String> rows,
    @NotNull @Min(1) @Max(200) Integer spotsPerRow
) {
}
