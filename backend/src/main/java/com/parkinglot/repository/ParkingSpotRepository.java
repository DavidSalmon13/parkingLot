package com.parkinglot.repository;

import com.parkinglot.entity.ParkingSpot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, UUID> {

    boolean existsByLotIdAndLabel(UUID lotId, String label);

    List<ParkingSpot> findByLotIdOrderByRowAscPositionAsc(UUID lotId);
}
