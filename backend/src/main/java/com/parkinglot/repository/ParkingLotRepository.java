package com.parkinglot.repository;

import com.parkinglot.entity.ParkingLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<ParkingLot> findByNameIgnoreCase(String name);

    // LEFT JOIN FETCH so GET /api/lots is one round trip, not N+1 (spec §8).
    @Query("SELECT DISTINCT l FROM ParkingLot l LEFT JOIN FETCH l.spots")
    List<ParkingLot> findAllWithSpots();
}
