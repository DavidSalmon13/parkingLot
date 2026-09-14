package com.parkinglot.websocket.events;

import java.util.UUID;

public record LotDeletedEvent(String type, UUID lotId) {
    public LotDeletedEvent(UUID lotId) {
        this("LOT_DELETED", lotId);
    }
}
