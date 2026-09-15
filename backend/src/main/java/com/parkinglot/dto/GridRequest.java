package com.parkinglot.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GridRequest(
    @NotEmpty(message = "חובה לבחור לפחות שורה אחת") @Size(max = 26, message = "עד 26 שורות") List<@Valid RowSpec> rows
) {
    // `count` spots are appended to this row, starting right after whatever
    // position it currently ends at (position 0 if the row doesn't exist yet
    // in this lot) - the same mechanism whether the row is brand new or
    // already has spots and is just being extended (spec §3.2/§3.5).
    public record RowSpec(
        @NotBlank(message = "חובה למלא") @Size(max = 10, message = "עד 10 תווים") String label,
        @NotNull(message = "חובה למלא") @Min(value = 1, message = "חייב להיות לפחות 1") @Max(value = 200, message = "עד 200") Integer count
    ) {
    }
}
