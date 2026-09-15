package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class LotHasOccupiedSpotsException extends ApiException {

    public LotHasOccupiedSpotsException(List<String> occupiedSpotLabels) {
        super("LOT_HAS_OCCUPIED_SPOTS", HttpStatus.CONFLICT,
            "Remove all cars from this lot before deleting it.", Map.of("occupiedSpotLabels", occupiedSpotLabels));
    }
}
