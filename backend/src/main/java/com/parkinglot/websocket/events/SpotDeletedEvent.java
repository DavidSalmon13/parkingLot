package com.parkinglot.websocket.events;

import java.util.UUID;

public record SpotDeletedEvent(String type, UUID lotId, UUID spotId) {
    public SpotDeletedEvent(UUID lotId, UUID spotId) {
        this("SPOT_DELETED", lotId, spotId);
    }
}
