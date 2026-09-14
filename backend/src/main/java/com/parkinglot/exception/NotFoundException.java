package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class NotFoundException extends ApiException {

    public NotFoundException(String errorCode, String message) {
        super(errorCode, HttpStatus.NOT_FOUND, message, Map.of());
    }
}
