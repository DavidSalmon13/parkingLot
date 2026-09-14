package com.parkinglot.repository;

import com.parkinglot.entity.CarAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CarAssignmentRepository extends JpaRepository<CarAssignment, UUID> {

    Optional<CarAssignment> findBySpotIdAndRemovedAtIsNull(UUID spotId);

    Optional<CarAssignment> findByCarIdAndRemovedAtIsNull(String carId);

    boolean existsBySpotIdAndRemovedAtIsNull(UUID spotId);

    // Batch lookup so GET /api/lots resolves every spot's status in one query
    // instead of one findBySpotIdAndRemovedAtIsNull per spot (spec §8). JOIN FETCH
    // the car too, otherwise `car` (a LAZY association) triggers a second N+1 -
    // one `SELECT ... FROM cars WHERE id = ?` per occupied spot - the moment the
    // DTO mapping touches getCar().getOwnerName() (spec §8's "lot -> spot ->
    // active assignment -> car" chain must be one round trip end to end).
    @Query("SELECT ca FROM CarAssignment ca JOIN FETCH ca.car WHERE ca.spot.id IN :spotIds AND ca.removedAt IS NULL")
    List<CarAssignment> findBySpotIdInAndRemovedAtIsNull(@Param("spotIds") List<UUID> spotIds);
}
