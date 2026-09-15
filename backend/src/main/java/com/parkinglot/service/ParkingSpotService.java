package com.parkinglot.service;

import com.parkinglot.dto.CarSummaryResponse;
import com.parkinglot.dto.CreateSpotRequest;
import com.parkinglot.dto.GridRequest;
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
import com.parkinglot.websocket.LotUpdatePublisher;
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
    private final LotUpdatePublisher lotUpdatePublisher;

    public ParkingSpotService(ParkingSpotRepository spotRepo, CarAssignmentRepository assignmentRepo,
                               LotUpdatePublisher lotUpdatePublisher) {
        this.spotRepo = spotRepo;
        this.assignmentRepo = assignmentRepo;
        this.lotUpdatePublisher = lotUpdatePublisher;
    }

    // The single place that computes a spot's derived status/car — every
    // controller that returns spot data goes through this (spec §2.5).
    public SpotResponse toDto(ParkingSpot spot) {
        return toDto(spot, assignmentRepo.findBySpotIdAndRemovedAtIsNull(spot.getId()));
    }

    public SpotResponse toDto(ParkingSpot spot, Optional<CarAssignment> activeAssignment) {
        return activeAssignment
            .map(a -> new SpotResponse(spot.getId(), spot.getLabel(), spot.getRow(), spot.getPosition(),
                "occupied", new CarSummaryResponse(a.getCar().getChassisNumber(), a.getCar().getLicensePlateNumber(), a.getCar().getCarType())))
            .orElseGet(() -> new SpotResponse(spot.getId(), spot.getLabel(), spot.getRow(), spot.getPosition(),
                "available", null));
    }

    public ParkingSpot getSpotOrThrow(UUID id) {
        return spotRepo.findById(id).orElseThrow(() -> new NotFoundException("SPOT_NOT_FOUND", "No spot found with ID " + id + "."));
    }

    @Transactional
    public List<SpotResponse> generateGrid(ParkingLot lot, List<GridRequest.RowSpec> rows) {
        List<ParkingSpot> created = new ArrayList<>();
        for (GridRequest.RowSpec row : rows) {
            int startPosition = spotRepo.findMaxPositionByLotIdAndRow(lot.getId(), row.label()).orElse(0) + 1;
            int endPosition = startPosition + row.count() - 1;
            for (int position = startPosition; position <= endPosition; position++) {
                String label = row.label() + position;
                if (!spotRepo.existsByLotIdAndLabel(lot.getId(), label)) {
                    created.add(spotRepo.save(new ParkingSpot(lot, label, row.label(), position)));
                }
            }
        }
        List<SpotResponse> dtos = created.stream().map(this::toDto).toList();
        dtos.forEach(dto -> lotUpdatePublisher.publishSpotCreated(lot.getId(), dto));
        return dtos;
    }

    @Transactional
    public SpotResponse addSpot(ParkingLot lot, CreateSpotRequest req) {
        if (spotRepo.existsByLotIdAndLabel(lot.getId(), req.label())) {
            throw new SpotLabelTakenException(req.label());
        }
        ParkingSpot saved = spotRepo.save(new ParkingSpot(lot, req.label(), req.row(), req.position()));
        SpotResponse dto = toDto(saved);
        lotUpdatePublisher.publishSpotCreated(lot.getId(), dto);
        return dto;
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
        SpotResponse dto = toDto(spot);
        lotUpdatePublisher.publishSpotUpdated(spot.getLot().getId(), dto);
        return dto;
    }

    @Transactional
    public void deleteSpot(UUID id) {
        ParkingSpot spot = getSpotOrThrow(id);
        assignmentRepo.findBySpotIdAndRemovedAtIsNull(id).ifPresent(a -> {
            throw new SpotOccupiedException("Remove the car from this spot before deleting it.", a.getCar().getChassisNumber());
        });
        UUID lotId = spot.getLot().getId();
        spotRepo.delete(spot);
        lotUpdatePublisher.publishSpotDeleted(lotId, id);
    }
}
