package com.parkinglot.service;

import com.parkinglot.dto.AssignCarRequest;
import com.parkinglot.dto.AssignmentResponse;
import com.parkinglot.entity.Car;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.CarAlreadyParkedException;
import com.parkinglot.exception.CarIdExistsException;
import com.parkinglot.exception.CarNotFoundException;
import com.parkinglot.exception.SpotNotOccupiedException;
import com.parkinglot.exception.SpotOccupiedException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.CarRepository;
import com.parkinglot.websocket.LotUpdatePublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AssignmentService {

    private final CarRepository carRepo;
    private final CarAssignmentRepository assignmentRepo;
    private final ParkingSpotService spotService;
    private final LotUpdatePublisher lotUpdatePublisher;

    public AssignmentService(CarRepository carRepo, CarAssignmentRepository assignmentRepo, ParkingSpotService spotService,
                              LotUpdatePublisher lotUpdatePublisher) {
        this.carRepo = carRepo;
        this.assignmentRepo = assignmentRepo;
        this.spotService = spotService;
        this.lotUpdatePublisher = lotUpdatePublisher;
    }

    @Transactional
    public AssignmentResponse assignCarToSpot(UUID spotId, AssignCarRequest req) {
        ParkingSpot spot = spotService.getSpotOrThrow(spotId);
        Optional<Car> existing = carRepo.findById(req.carId());

        Car car;
        if (req.newCar() != null) {
            if (existing.isPresent()) {
                throw new CarIdExistsException(req.carId());
            }
            car = carRepo.save(new Car(req.carId(), req.newCar().licensePlateNumber(), req.newCar().carType(),
                req.newCar().clientName(), req.newCar().deliveryDate()));
        } else {
            car = existing.orElseThrow(() -> new CarNotFoundException(req.carId()));
        }

        // Explicit pre-checks give a fast, friendly error in the common case;
        // the DB's partial unique indexes (entity/CarAssignment, V2__constraints.sql)
        // are the real guarantee against a concurrent double-booking slipping through
        // (backstopped by GlobalExceptionHandler's DataIntegrityViolationException handling).
        assignmentRepo.findBySpotIdAndRemovedAtIsNull(spotId).ifPresent(a -> {
            throw new SpotOccupiedException("המקום " + spot.getLabel() + " כבר תפוס על ידי רכב אחר.", a.getCar().getChassisNumber());
        });
        assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull(req.carId()).ifPresent(a -> {
            String lotName = a.getSpot().getLot().getName();
            String spotLabel = a.getSpot().getLabel();
            throw new CarAlreadyParkedException(
                "הרכב " + req.carId() + " כבר חונה בחניון " + lotName + ", מקום " + spotLabel + ". יש להסיר אותו משם קודם.",
                lotName, spotLabel);
        });

        CarAssignment saved = assignmentRepo.save(new CarAssignment(car, spot));
        lotUpdatePublisher.publishSpotUpdated(spot.getLot().getId(), spotService.toDto(spot, Optional.of(saved)));
        return new AssignmentResponse(saved.getId(), car.getChassisNumber(), spot.getId(), saved.getAssignedAt(),
            spot.getLot().getName(), spot.getLabel());
    }

    @Transactional
    public void removeCarFromSpot(UUID spotId) {
        CarAssignment active = assignmentRepo.findBySpotIdAndRemovedAtIsNull(spotId)
            .orElseThrow(SpotNotOccupiedException::new);
        active.setRemovedAt(Instant.now());
        ParkingSpot spot = active.getSpot();
        lotUpdatePublisher.publishSpotUpdated(spot.getLot().getId(), spotService.toDto(spot, Optional.empty()));
    }
}
