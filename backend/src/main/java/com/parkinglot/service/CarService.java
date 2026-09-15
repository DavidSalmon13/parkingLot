package com.parkinglot.service;

import com.parkinglot.dto.CarDetailResponse;
import com.parkinglot.dto.CreateCarRequest;
import com.parkinglot.dto.UpdateCarRequest;
import com.parkinglot.entity.Car;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.exception.CarIdExistsException;
import com.parkinglot.exception.CarNotFoundException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.CarRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
        if (carRepo.existsById(req.chassisNumber())) {
            throw new CarIdExistsException(req.chassisNumber());
        }
        Car saved = carRepo.save(new Car(req.chassisNumber(), req.licensePlateNumber(), req.carType(),
            req.clientName(), req.deliveryDate()));
        return toDetailResponse(saved, Optional.empty());
    }

    @Transactional
    public CarDetailResponse updateCar(String carId, UpdateCarRequest req) {
        Car car = getCarOrThrow(carId);
        car.setLicensePlateNumber(req.licensePlateNumber());
        car.setCarType(req.carType());
        car.setClientName(req.clientName());
        car.setDeliveryDate(req.deliveryDate());
        Optional<CarAssignment> active = assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull(carId);
        return toDetailResponse(car, active);
    }

    @Transactional(readOnly = true)
    public CarDetailResponse getCarWithLocation(String carId) {
        Car car = getCarOrThrow(carId);
        Optional<CarAssignment> active = assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull(carId);
        return toDetailResponse(car, active);
    }

    @Transactional(readOnly = true)
    public List<CarDetailResponse> getUnassignedCars() {
        return carRepo.findAllUnassigned().stream()
            .map(car -> toDetailResponse(car, Optional.empty()))
            .toList();
    }

    private CarDetailResponse toDetailResponse(Car car, Optional<CarAssignment> active) {
        CarDetailResponse.CurrentLocation location = active
            .map(a -> new CarDetailResponse.CurrentLocation(a.getSpot().getLot().getName(), a.getSpot().getLabel(), a.getAssignedAt()))
            .orElse(null);
        return new CarDetailResponse(car.getChassisNumber(), car.getLicensePlateNumber(), car.getCarType(),
            car.getClientName(), car.getDeliveryDate(), location);
    }
}
