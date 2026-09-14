package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class CarAlreadyParkedException extends ApiException {

    public CarAlreadyParkedException(String message, String lotName, String spotLabel) {
        super("CAR_ALREADY_PARKED", HttpStatus.CONFLICT, message,
            (lotName != null && spotLabel != null) ? Map.of("lotName", lotName, "spotLabel", spotLabel) : Map.of());
    }

    // Used by the DB-race backstop (GlobalExceptionHandler), where the blocking location isn't known.
    public CarAlreadyParkedException(String message) {
        this(message, null, null);
    }
}
