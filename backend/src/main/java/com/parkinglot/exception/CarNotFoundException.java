package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class CarNotFoundException extends ApiException {

    public CarNotFoundException(String carId) {
        super("CAR_NOT_FOUND", HttpStatus.NOT_FOUND, "No car found with ID " + carId + ".", Map.of());
    }
}
