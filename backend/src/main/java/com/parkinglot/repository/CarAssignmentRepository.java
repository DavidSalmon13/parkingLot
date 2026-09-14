package com.parkinglot.repository;

import com.parkinglot.entity.CarAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CarAssignmentRepository extends JpaRepository<CarAssignment, UUID> {

    Optional<CarAssignment> findBySpotIdAndRemovedAtIsNull(UUID spotId);

    Optional<CarAssignment> findByCarIdAndRemovedAtIsNull(String carId);

    boolean existsBySpotIdAndRemovedAtIsNull(UUID spotId);
}
