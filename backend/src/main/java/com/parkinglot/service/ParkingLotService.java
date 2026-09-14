package com.parkinglot.service;

import com.parkinglot.dto.CreateLotRequest;
import com.parkinglot.dto.LotResponse;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.dto.UpdateLotRequest;
import com.parkinglot.dto.GridRequest;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.LotHasOccupiedSpotsException;
import com.parkinglot.exception.LotNameTakenException;
import com.parkinglot.exception.NotFoundException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.ParkingLotRepository;
import com.parkinglot.repository.ParkingSpotRepository;
import com.parkinglot.websocket.LotUpdatePublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ParkingLotService {

    private final ParkingLotRepository lotRepo;
    private final ParkingSpotRepository spotRepo;
    private final CarAssignmentRepository assignmentRepo;
    private final ParkingSpotService spotService;
    private final LotUpdatePublisher lotUpdatePublisher;

    public ParkingLotService(ParkingLotRepository lotRepo, ParkingSpotRepository spotRepo,
                              CarAssignmentRepository assignmentRepo, ParkingSpotService spotService,
                              LotUpdatePublisher lotUpdatePublisher) {
        this.lotRepo = lotRepo;
        this.spotRepo = spotRepo;
        this.assignmentRepo = assignmentRepo;
        this.spotService = spotService;
        this.lotUpdatePublisher = lotUpdatePublisher;
    }

    @Transactional(readOnly = true)
    public List<LotResponse> getAllLotsWithSpots() {
        List<ParkingLot> lots = lotRepo.findAllWithSpots();

        List<UUID> allSpotIds = lots.stream().flatMap(l -> l.getSpots().stream()).map(ParkingSpot::getId).toList();
        Map<UUID, CarAssignment> activeBySpotId = new HashMap<>();
        for (CarAssignment a : assignmentRepo.findBySpotIdInAndRemovedAtIsNull(allSpotIds)) {
            activeBySpotId.put(a.getSpot().getId(), a);
        }

        return lots.stream().map(lot -> toLotResponse(lot, activeBySpotId)).toList();
    }

    private LotResponse toLotResponse(ParkingLot lot, Map<UUID, CarAssignment> activeBySpotId) {
        List<SpotResponse> spots = lot.getSpots().stream()
            .map(spot -> spotService.toDto(spot, Optional.ofNullable(activeBySpotId.get(spot.getId()))))
            .toList();
        return new LotResponse(lot.getId(), lot.getName(), lot.getRowLabels(), spots);
    }

    public ParkingLot getLotOrThrow(UUID id) {
        return lotRepo.findById(id).orElseThrow(() -> new NotFoundException("LOT_NOT_FOUND", "No lot found with ID " + id + "."));
    }

    @Transactional
    public LotResponse createLot(CreateLotRequest req) {
        if (lotRepo.existsByNameIgnoreCase(req.name())) {
            throw new LotNameTakenException(req.name());
        }
        ParkingLot lot = new ParkingLot(req.name());
        if (req.grid() != null) {
            lot.setRowLabels(req.grid().rows().stream().map(GridRequest.RowSpec::label).toList());
        }
        lot = lotRepo.save(lot);

        List<SpotResponse> spots = req.grid() != null
            ? spotService.generateGrid(lot, req.grid().rows())
            : List.of();
        LotResponse response = new LotResponse(lot.getId(), lot.getName(), lot.getRowLabels(), spots);
        lotUpdatePublisher.publishLotCreated(response);
        return response;
    }

    @Transactional
    public LotResponse renameLot(UUID id, UpdateLotRequest req) {
        ParkingLot lot = getLotOrThrow(id);
        if (!lot.getName().equalsIgnoreCase(req.name()) && lotRepo.existsByNameIgnoreCase(req.name())) {
            throw new LotNameTakenException(req.name());
        }
        lot.setName(req.name());
        List<SpotResponse> spots = lot.getSpots().stream().map(spotService::toDto).toList();
        LotResponse response = new LotResponse(lot.getId(), lot.getName(), lot.getRowLabels(), spots);
        lotUpdatePublisher.publishLotUpdated(response);
        return response;
    }

    @Transactional
    public void deleteLot(UUID id) {
        ParkingLot lot = getLotOrThrow(id);
        List<ParkingSpot> spots = lot.getSpots();
        List<UUID> spotIds = spots.stream().map(ParkingSpot::getId).toList();
        List<CarAssignment> occupied = assignmentRepo.findBySpotIdInAndRemovedAtIsNull(spotIds);
        if (!occupied.isEmpty()) {
            List<String> labels = occupied.stream().map(a -> a.getSpot().getLabel()).toList();
            throw new LotHasOccupiedSpotsException(labels);
        }
        // parking_spots.lot_id is ON DELETE RESTRICT, so the spots must go first.
        spotRepo.deleteAll(spots);
        lotRepo.delete(lot);
        lotUpdatePublisher.publishLotDeleted(id);
    }
}
