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
import com.parkinglot.exception.RowFullyOccupiedException;
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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
        return spotRepo.findById(id).orElseThrow(() -> new NotFoundException("SPOT_NOT_FOUND", "לא נמצא מקום חניה עם המספר " + id + "."));
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

    // Quick "+" control on a row: appends one spot right after the row's
    // current highest position, same convention generateGrid/addSpot use.
    @Transactional
    public SpotResponse addSpotToRowEnd(ParkingLot lot, String row) {
        int position = spotRepo.findMaxPositionByLotIdAndRow(lot.getId(), row)
            .orElseThrow(() -> new NotFoundException("ROW_NOT_FOUND", "לא נמצאה שורה '" + row + "' בחניון זה.")) + 1;
        String label = row + position;
        if (spotRepo.existsByLotIdAndLabel(lot.getId(), label)) {
            throw new SpotLabelTakenException(label);
        }
        ParkingSpot saved = spotRepo.save(new ParkingSpot(lot, label, row, position));
        SpotResponse dto = toDto(saved);
        lotUpdatePublisher.publishSpotCreated(lot.getId(), dto);
        return dto;
    }

    // Quick "-" control on a row: removes the first available spot scanning
    // from the row's end backwards (skipping occupied spots at the tail),
    // then shifts every spot after the removed one down by one position so
    // the row stays contiguous — e.g. removing empty A4 turns occupied A5
    // into A4.
    @Transactional
    public void removeLastAvailableSpotFromRow(ParkingLot lot, String row) {
        List<ParkingSpot> spots = spotRepo.findByLotIdAndRowOrderByPositionAsc(lot.getId(), row);
        if (spots.isEmpty()) {
            throw new NotFoundException("ROW_NOT_FOUND", "לא נמצאה שורה '" + row + "' בחניון זה.");
        }

        List<UUID> spotIds = spots.stream().map(ParkingSpot::getId).toList();
        Set<UUID> occupiedSpotIds = assignmentRepo.findBySpotIdInAndRemovedAtIsNull(spotIds).stream()
            .map(a -> a.getSpot().getId())
            .collect(Collectors.toSet());

        ParkingSpot target = null;
        for (int i = spots.size() - 1; i >= 0; i--) {
            if (!occupiedSpotIds.contains(spots.get(i).getId())) {
                target = spots.get(i);
                break;
            }
        }
        if (target == null) {
            throw new RowFullyOccupiedException(row);
        }

        UUID lotId = lot.getId();
        int removedPosition = target.getPosition();
        List<ParkingSpot> toShift = spots.stream().filter(s -> s.getPosition() > removedPosition).toList();

        spotRepo.delete(target);
        // Force the delete to hit the DB now — Hibernate's default flush
        // ordering runs updates before deletes regardless of call order, which
        // would otherwise try to rename e.g. B6 to the still-occupied B5 label
        // and trip the (lot_id, label) unique constraint.
        spotRepo.flush();
        lotUpdatePublisher.publishSpotDeleted(lotId, target.getId());

        // Processed lowest position first, each iteration flushed before the
        // next: the label a spot is renamed to was just freed by the previous
        // step (the delete above, or the prior iteration's rename), so no
        // rename here can collide with a label that's still in use.
        for (ParkingSpot spot : toShift) {
            spot.setPosition(spot.getPosition() - 1);
            spot.setLabel(row + spot.getPosition());
            spotRepo.saveAndFlush(spot);
            lotUpdatePublisher.publishSpotUpdated(lotId, toDto(spot));
        }
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
            throw new SpotOccupiedException("יש להסיר את הרכב מהמקום הזה לפני מחיקתו.", a.getCar().getChassisNumber());
        });
        UUID lotId = spot.getLot().getId();
        spotRepo.delete(spot);
        lotUpdatePublisher.publishSpotDeleted(lotId, id);
    }
}
