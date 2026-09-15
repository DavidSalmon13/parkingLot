package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class CarIdExistsException extends ApiException {

    public CarIdExistsException(String carId) {
        super("CAR_ID_EXISTS", HttpStatus.CONFLICT,
            "רכב עם המספר " + carId + " כבר קיים במערכת. יש להשתמש באפשרות 'רכב קיים' כדי לשייך אותו למקום.", Map.of());
    }
}
