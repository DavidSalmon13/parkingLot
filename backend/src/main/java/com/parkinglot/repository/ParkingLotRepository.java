package com.parkinglot.repository;

import com.parkinglot.entity.ParkingLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<ParkingLot> findByNameIgnoreCase(String name);
}
