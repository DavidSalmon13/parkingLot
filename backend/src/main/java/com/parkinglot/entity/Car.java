package com.parkinglot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "cars")
public class Car {

    // User-supplied, exactly 6 characters — no @GeneratedValue.
    @Id
    @Column(length = 6)
    private String id;

    @Column(name = "owner_name", nullable = false, length = 100)
    private String ownerName;

    @Column(name = "employee_id", nullable = false, length = 50)
    private String employeeId;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Car() {
    }

    public Car(String id, String ownerName, String employeeId, String phoneNumber, String notes) {
        this.id = id;
        this.ownerName = ownerName;
        this.employeeId = employeeId;
        this.phoneNumber = phoneNumber;
        this.notes = notes;
    }

    public String getId() {
        return id;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
