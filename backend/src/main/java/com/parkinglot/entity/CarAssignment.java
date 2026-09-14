package com.parkinglot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "car_assignments")
public class CarAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spot_id", nullable = false)
    private ParkingSpot spot;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    // NULL means this assignment is currently active.
    @Column(name = "removed_at")
    private Instant removedAt;

    // Unused in v1, reserved for future auth (spec §10) — mapped now so the
    // column exists, populated later once a User entity exists.
    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "removed_by_user_id")
    private UUID removedByUserId;

    protected CarAssignment() {
    }

    public CarAssignment(Car car, ParkingSpot spot) {
        this.car = car;
        this.spot = spot;
        this.assignedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Car getCar() {
        return car;
    }

    public ParkingSpot getSpot() {
        return spot;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public void setRemovedAt(Instant removedAt) {
        this.removedAt = removedAt;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(UUID createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public UUID getRemovedByUserId() {
        return removedByUserId;
    }

    public void setRemovedByUserId(UUID removedByUserId) {
        this.removedByUserId = removedByUserId;
    }
}
