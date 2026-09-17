package com.parkinglot.controller;

import com.parkinglot.dto.CreateLotRequest;
import com.parkinglot.dto.CreateSpotRequest;
import com.parkinglot.dto.GridRequest;
import com.parkinglot.dto.LotResponse;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.dto.UpdateLotRequest;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.service.ParkingLotService;
import com.parkinglot.service.ParkingSpotService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class ParkingLotController {

    private final ParkingLotService lotService;
    private final ParkingSpotService spotService;

    public ParkingLotController(ParkingLotService lotService, ParkingSpotService spotService) {
        this.lotService = lotService;
        this.spotService = spotService;
    }

    @GetMapping("/api/lots")
    public List<LotResponse> getAllLots() {
        return lotService.getAllLotsWithSpots();
    }

    @PostMapping("/api/lots")
    public ResponseEntity<LotResponse> createLot(@Valid @RequestBody CreateLotRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lotService.createLot(req));
    }

    @PutMapping("/api/lots/{id}")
    public LotResponse renameLot(@PathVariable UUID id, @Valid @RequestBody UpdateLotRequest req) {
        return lotService.renameLot(id, req);
    }

    @DeleteMapping("/api/lots/{id}")
    public ResponseEntity<Void> deleteLot(@PathVariable UUID id) {
        lotService.deleteLot(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/lots/{id}/spots/generate")
    public ResponseEntity<List<SpotResponse>> generateSpots(@PathVariable UUID id, @Valid @RequestBody GridRequest req) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        List<SpotResponse> created = spotService.generateGrid(lot, req.rows());
        HttpStatus status = created.isEmpty() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(created);
    }

    @PostMapping("/api/lots/{id}/spots")
    public ResponseEntity<SpotResponse> addSpot(@PathVariable UUID id, @Valid @RequestBody CreateSpotRequest req) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(spotService.addSpot(lot, req));
    }

    // Quick row controls (the +/- at the end of a row on the dashboard grid).
    @PostMapping("/api/lots/{id}/rows/{row}/spots")
    public ResponseEntity<SpotResponse> addSpotToRow(@PathVariable UUID id, @PathVariable String row) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(spotService.addSpotToRowEnd(lot, row));
    }

    @DeleteMapping("/api/lots/{id}/rows/{row}/spots")
    public ResponseEntity<Void> removeLastAvailableSpotFromRow(@PathVariable UUID id, @PathVariable String row) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        spotService.removeLastAvailableSpotFromRow(lot, row);
        return ResponseEntity.noContent().build();
    }

    // Quick lot controls (the +/- next to the lot name that add/remove a whole row).
    @PostMapping("/api/lots/{id}/rows")
    public ResponseEntity<SpotResponse> addRow(@PathVariable UUID id) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(spotService.addRowToLot(lot));
    }

    @DeleteMapping("/api/lots/{id}/rows/last")
    public ResponseEntity<Void> removeLastRow(@PathVariable UUID id) {
        ParkingLot lot = lotService.getLotOrThrow(id);
        spotService.removeLastRowFromLot(lot);
        return ResponseEntity.noContent().build();
    }
}
