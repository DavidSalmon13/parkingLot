package com.parkinglot.websocket.events;

import com.parkinglot.dto.SpotResponse;

import java.util.UUID;

public record SpotUpdatedEvent(String type, UUID lotId, SpotResponse spot) {
    public SpotUpdatedEvent(UUID lotId, SpotResponse spot) {
        this("SPOT_UPDATED", lotId, spot);
    }
}
