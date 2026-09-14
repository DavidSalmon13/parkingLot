package com.parkinglot.repository;

import com.parkinglot.entity.ParkingSpot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, UUID> {

    boolean existsByLotIdAndLabel(UUID lotId, String label);

    List<ParkingSpot> findByLotIdOrderByRowAscPositionAsc(UUID lotId);

    // Lets grid generation append spots to a row that already has some,
    // instead of only ever being able to build a row from position 1 (spec §3.5).
    @Query("SELECT MAX(s.position) FROM ParkingSpot s WHERE s.lot.id = :lotId AND s.row = :row")
    Optional<Integer> findMaxPositionByLotIdAndRow(@Param("lotId") UUID lotId, @Param("row") String row);
}
