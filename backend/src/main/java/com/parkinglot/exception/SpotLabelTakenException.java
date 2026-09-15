package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class SpotLabelTakenException extends ApiException {

    public SpotLabelTakenException(String label) {
        super("SPOT_LABEL_TAKEN", HttpStatus.CONFLICT, "Spot label '" + label + "' is already used in this lot.", Map.of());
    }
}
