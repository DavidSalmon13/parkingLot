package com.parkinglot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "parking_lots")
public class ParkingLot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "row_labels", columnDefinition = "text[]", nullable = false)
    private List<String> rowLabels = new ArrayList<>();

    // Deliberately no cascade/orphanRemoval — spot deletion goes through
    // ParkingSpotService's occupancy checks (§3.8), never through this lot-side collection.
    @OneToMany(mappedBy = "lot", fetch = FetchType.LAZY)
    @OrderBy("row asc, position asc")
    private List<ParkingSpot> spots = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ParkingLot() {
    }

    public ParkingLot(String name) {
        this.name = name;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getRowLabels() {
        return rowLabels;
    }

    public void setRowLabels(List<String> rowLabels) {
        this.rowLabels = rowLabels;
    }

    public List<ParkingSpot> getSpots() {
        return spots;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
