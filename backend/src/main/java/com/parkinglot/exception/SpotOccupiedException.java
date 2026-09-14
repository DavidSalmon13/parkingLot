package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class SpotOccupiedException extends ApiException {

    public SpotOccupiedException(String message, String carId) {
        super("SPOT_OCCUPIED", HttpStatus.CONFLICT, message, carId != null ? Map.of("carId", carId) : Map.of());
    }

    // Used by the DB-race backstop (GlobalExceptionHandler), where the winning car's id isn't known.
    public SpotOccupiedException(String message) {
        this(message, null);
    }
}
