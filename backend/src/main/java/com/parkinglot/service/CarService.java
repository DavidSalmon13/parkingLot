package com.parkinglot.service;

import com.parkinglot.dto.CarDetailResponse;
import com.parkinglot.dto.CreateCarRequest;
import com.parkinglot.entity.Car;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.exception.CarIdExistsException;
import com.parkinglot.exception.CarNotFoundException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.CarRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CarService {

    private final CarRepository carRepo;
    private final CarAssignmentRepository assignmentRepo;

    public CarService(CarRepository carRepo, CarAssignmentRepository assignmentRepo) {
        this.carRepo = carRepo;
        this.assignmentRepo = assignmentRepo;
    }

    public Car getCarOrThrow(String carId) {
        return carRepo.findById(carId).orElseThrow(() -> new CarNotFoundException(carId));
    }

    @Transactional
    public CarDetailResponse createCar(CreateCarRequest req) {
        if (carRepo.existsById(req.id())) {
            throw new CarIdExistsException(req.id());
        }
        Car saved = carRepo.save(new Car(req.id(), req.ownerName(), req.employeeId(), req.phoneNumber(), req.notes()));
        return toDetailResponse(saved, Optional.empty());
    }

    @Transactional(readOnly = true)
    public CarDetailResponse getCarWithLocation(String carId) {
        Car car = getCarOrThrow(carId);
        Optional<CarAssignment> active = assignmentRepo.findByCarIdAndRemovedAtIsNull(carId);
        return toDetailResponse(car, active);
    }

    private CarDetailResponse toDetailResponse(Car car, Optional<CarAssignment> active) {
        CarDetailResponse.CurrentLocation location = active
            .map(a -> new CarDetailResponse.CurrentLocation(a.getSpot().getLot().getName(), a.getSpot().getLabel()))
            .orElse(null);
        return new CarDetailResponse(car.getId(), car.getOwnerName(), car.getEmployeeId(),
            car.getPhoneNumber(), car.getNotes(), location);
    }
}
