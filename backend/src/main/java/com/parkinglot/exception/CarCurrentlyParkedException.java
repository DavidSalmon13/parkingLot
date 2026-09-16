package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class CarCurrentlyParkedException extends ApiException {

    public CarCurrentlyParkedException(String lotName, String spotLabel) {
        super("CAR_CURRENTLY_PARKED", HttpStatus.CONFLICT,
            "הרכב חונה כעת בחניון " + lotName + ", מקום " + spotLabel + ". יש להסיר אותו מהמקום לפני המחיקה.",
            Map.of("lotName", lotName, "spotLabel", spotLabel));
    }
}
