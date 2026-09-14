package com.parkinglot.controller;

import com.parkinglot.dto.SpotResponse;
import com.parkinglot.dto.UpdateSpotRequest;
import com.parkinglot.service.ParkingSpotService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ParkingSpotController {

    private final ParkingSpotService spotService;

    public ParkingSpotController(ParkingSpotService spotService) {
        this.spotService = spotService;
    }

    @PutMapping("/api/spots/{id}")
    public SpotResponse updateSpot(@PathVariable UUID id, @Valid @RequestBody UpdateSpotRequest req) {
        return spotService.updateSpot(id, req);
    }

    @DeleteMapping("/api/spots/{id}")
    public ResponseEntity<Void> deleteSpot(@PathVariable UUID id) {
        spotService.deleteSpot(id);
        return ResponseEntity.noContent().build();
    }
}
