package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class RowFullyOccupiedException extends ApiException {

    public RowFullyOccupiedException(String row) {
        super("ROW_FULLY_OCCUPIED", HttpStatus.CONFLICT,
            "כל המקומות בשורה '" + row + "' תפוסים — אין מקום פנוי להסרה.", Map.of());
    }
}
