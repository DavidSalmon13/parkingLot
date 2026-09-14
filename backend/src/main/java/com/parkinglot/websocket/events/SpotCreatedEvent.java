package com.parkinglot.websocket.events;

import com.parkinglot.dto.SpotResponse;

import java.util.UUID;

public record SpotCreatedEvent(String type, UUID lotId, SpotResponse spot) {
    public SpotCreatedEvent(UUID lotId, SpotResponse spot) {
        this("SPOT_CREATED", lotId, spot);
    }
}
