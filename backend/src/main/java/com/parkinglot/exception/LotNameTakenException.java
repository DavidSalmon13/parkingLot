package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class LotNameTakenException extends ApiException {

    public LotNameTakenException(String name) {
        super("LOT_NAME_TAKEN", HttpStatus.CONFLICT, "A lot named '" + name + "' already exists.", Map.of());
    }
}
