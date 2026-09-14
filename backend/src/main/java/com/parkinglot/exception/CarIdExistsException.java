package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class CarIdExistsException extends ApiException {

    public CarIdExistsException(String carId) {
        super("CAR_ID_EXISTS", HttpStatus.CONFLICT,
            "A car with ID " + carId + " already exists. Use the existing-car flow to assign it to a spot.", Map.of());
    }
}
