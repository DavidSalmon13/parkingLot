package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class SpotNotOccupiedException extends ApiException {

    public SpotNotOccupiedException() {
        super("SPOT_NOT_OCCUPIED", HttpStatus.CONFLICT, "This spot has no car parked in it.", Map.of());
    }
}
