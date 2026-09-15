package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class LotHasOccupiedSpotsException extends ApiException {

    public LotHasOccupiedSpotsException(List<String> occupiedSpotLabels) {
        super("LOT_HAS_OCCUPIED_SPOTS", HttpStatus.CONFLICT,
            "יש להסיר את כל הרכבים מהחניון הזה לפני מחיקתו.", Map.of("occupiedSpotLabels", occupiedSpotLabels));
    }
}
