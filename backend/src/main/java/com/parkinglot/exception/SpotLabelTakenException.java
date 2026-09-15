package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class SpotLabelTakenException extends ApiException {

    public SpotLabelTakenException(String label) {
        super("SPOT_LABEL_TAKEN", HttpStatus.CONFLICT, "התווית '" + label + "' כבר בשימוש בחניון הזה.", Map.of());
    }
}
