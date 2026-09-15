package com.parkinglot.controller;

import com.parkinglot.dto.CarDetailResponse;
import com.parkinglot.dto.CreateCarRequest;
import com.parkinglot.dto.UpdateCarRequest;
import com.parkinglot.service.CarService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CarController {

    private final CarService carService;

    public CarController(CarService carService) {
        this.carService = carService;
    }

    @PostMapping("/api/cars")
    public ResponseEntity<CarDetailResponse> createCar(@Valid @RequestBody CreateCarRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(carService.createCar(req));
    }

    // Registered ahead of GET /api/cars/{carId} in effect — Spring prefers the
    // more specific literal mapping over the path-variable one for this segment.
    @GetMapping("/api/cars/unassigned")
    public List<CarDetailResponse> getUnassignedCars() {
        return carService.getUnassignedCars();
    }

    @GetMapping("/api/cars/{carId}")
    public CarDetailResponse getCar(@PathVariable String carId) {
        return carService.getCarWithLocation(carId);
    }

    @PutMapping("/api/cars/{carId}")
    public CarDetailResponse updateCar(@PathVariable String carId, @Valid @RequestBody UpdateCarRequest req) {
        return carService.updateCar(carId, req);
    }
}
