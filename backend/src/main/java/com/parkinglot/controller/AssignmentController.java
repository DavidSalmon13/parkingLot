package com.parkinglot.controller;

import com.parkinglot.dto.AssignCarRequest;
import com.parkinglot.dto.AssignmentResponse;
import com.parkinglot.service.AssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @PostMapping("/api/spots/{spotId}/assign")
    public ResponseEntity<AssignmentResponse> assignCar(@PathVariable UUID spotId, @Valid @RequestBody AssignCarRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.assignCarToSpot(spotId, req));
    }

    @DeleteMapping("/api/spots/{spotId}/assign")
    public ResponseEntity<Void> removeCar(@PathVariable UUID spotId) {
        assignmentService.removeCarFromSpot(spotId);
        return ResponseEntity.noContent().build();
    }
}
