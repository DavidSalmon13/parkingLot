package com.parkinglot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "cars")
public class Car {

    public static final String DEFAULT_EMOJI = "🚗";

    // User-supplied identifier — no @GeneratedValue.
    @Id
    @Column(name = "chassis_number", length = 50)
    private String chassisNumber;

    @Column(name = "license_plate_number", length = 20)
    private String licensePlateNumber;

    @Column(name = "car_type", nullable = false, length = 50)
    private String carType;

    @Column(name = "client_name", length = 100)
    private String clientName;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "emoji", nullable = false, length = 16)
    private String emoji = DEFAULT_EMOJI;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Car() {
    }

    public Car(String chassisNumber, String licensePlateNumber, String carType, String clientName, LocalDate deliveryDate,
               String emoji) {
        this.chassisNumber = chassisNumber;
        this.licensePlateNumber = licensePlateNumber;
        this.carType = carType;
        this.clientName = clientName;
        this.deliveryDate = deliveryDate;
        setEmoji(emoji);
    }

    public String getChassisNumber() {
        return chassisNumber;
    }

    public String getLicensePlateNumber() {
        return licensePlateNumber;
    }

    public void setLicensePlateNumber(String licensePlateNumber) {
        this.licensePlateNumber = licensePlateNumber;
    }

    public String getCarType() {
        return carType;
    }

    public void setCarType(String carType) {
        this.carType = carType;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public String getEmoji() {
        return emoji;
    }

    // A missing or blank emoji falls back to the default car.
    public void setEmoji(String emoji) {
        this.emoji = emoji == null || emoji.isBlank() ? DEFAULT_EMOJI : emoji.strip();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
