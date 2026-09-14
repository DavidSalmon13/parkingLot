package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public abstract class ApiException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;
    private final Map<String, Object> details;

    protected ApiException(String errorCode, HttpStatus httpStatus, String message, Map<String, Object> details) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        this.details = details;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
