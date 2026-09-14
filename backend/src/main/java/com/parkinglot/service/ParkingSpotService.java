package com.parkinglot.service;

import com.parkinglot.dto.CarSummaryResponse;
import com.parkinglot.dto.CreateSpotRequest;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.dto.UpdateSpotRequest;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.NotFoundException;
import com.parkinglot.exception.SpotLabelTakenException;
import com.parkinglot.exception.SpotOccupiedException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.ParkingSpotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ParkingSpotService {

    private final ParkingSpotRepository spotRepo;
    private final CarAssignmentRepository assignmentRepo;

    public ParkingSpotService(ParkingSpotRepository spotRepo, CarAssignmentRepository assignmentRepo) {
        this.spotRepo = spotRepo;
        this.assignmentRepo = assignmentRepo;
    }

    // The single place that computes a spot's derived status/car — every
    // controller that returns spot data goes through this (spec §2.5).
    public SpotResponse toDto(ParkingSpot spot) {
        return toDto(spot, assignmentRepo.findBySpotIdAndRemovedAtIsNull(spot.getId()));
    }

    public SpotResponse toDto(ParkingSpot spot, Optional<CarAssignment> activeAssignment) {
        return activeAssignment
            .map(a -> new SpotResponse(spot.getId(), spot.getLabel(), spot.getRow(), spot.getPosition(),
                "occupied", new CarSummaryResponse(a.getCar().getId(), a.getCar().getOwnerName())))
            .orElseGet(() -> new SpotResponse(spot.getId(), spot.getLabel(), spot.getRow(), spot.getPosition(),
                "available", null));
    }

    public ParkingSpot getSpotOrThrow(UUID id) {
        return spotRepo.findById(id).orElseThrow(() -> new NotFoundException("SPOT_NOT_FOUND", "No spot found with ID " + id + "."));
    }

    @Transactional
    public List<SpotResponse> generateGrid(ParkingLot lot, List<String> rows, int spotsPerRow) {
        List<ParkingSpot> created = new ArrayList<>();
        for (String row : rows) {
            for (int position = 1; position <= spotsPerRow; position++) {
                String label = row + position;
                if (!spotRepo.existsByLotIdAndLabel(lot.getId(), label)) {
                    created.add(spotRepo.save(new ParkingSpot(lot, label, row, position)));
                }
            }
        }
        return created.stream().map(this::toDto).toList();
    }

    @Transactional
    public SpotResponse addSpot(ParkingLot lot, CreateSpotRequest req) {
        if (spotRepo.existsByLotIdAndLabel(lot.getId(), req.label())) {
            throw new SpotLabelTakenException(req.label());
        }
        ParkingSpot saved = spotRepo.save(new ParkingSpot(lot, req.label(), req.row(), req.position()));
        return toDto(saved);
    }

    @Transactional
    public SpotResponse updateSpot(UUID id, UpdateSpotRequest req) {
        ParkingSpot spot = getSpotOrThrow(id);
        if (!spot.getLabel().equals(req.label()) && spotRepo.existsByLotIdAndLabel(spot.getLot().getId(), req.label())) {
            throw new SpotLabelTakenException(req.label());
        }
        spot.setLabel(req.label());
        spot.setRow(req.row());
        spot.setPosition(req.position());
        return toDto(spot);
    }

    @Transactional
    public void deleteSpot(UUID id) {
        ParkingSpot spot = getSpotOrThrow(id);
        assignmentRepo.findBySpotIdAndRemovedAtIsNull(id).ifPresent(a -> {
            throw new SpotOccupiedException("Remove the car from this spot before deleting it.", a.getCar().getId());
        });
        spotRepo.delete(spot);
    }
}
