package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class RowHasOccupiedSpotsException extends ApiException {

    public RowHasOccupiedSpotsException(String row, List<String> occupiedSpotLabels) {
        super("ROW_HAS_OCCUPIED_SPOTS", HttpStatus.CONFLICT,
            "יש להסיר את כל הרכבים משורה '" + row + "' לפני מחיקתה.", Map.of("occupiedSpotLabels", occupiedSpotLabels));
    }
}
