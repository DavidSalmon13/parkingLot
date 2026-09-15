package com.parkinglot.repository;

import com.parkinglot.entity.Car;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CarRepository extends JpaRepository<Car, String> {

    // Cars with no currently-active assignment (removedAt IS NULL on none of
    // their assignments) — i.e. registered but not parked in any spot.
    @Query("SELECT c FROM Car c WHERE NOT EXISTS "
        + "(SELECT 1 FROM CarAssignment ca WHERE ca.car = c AND ca.removedAt IS NULL) "
        + "ORDER BY c.clientName")
    List<Car> findAllUnassigned();
}
