package com.parkinglot.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ParkingLotController {

    // Stub for the §1 architecture wiring check; replaced by the real
    // service-backed implementation in §3.1.
    @GetMapping("/api/lots")
    public List<Object> getAllLots() {
        return List.of();
    }
}
