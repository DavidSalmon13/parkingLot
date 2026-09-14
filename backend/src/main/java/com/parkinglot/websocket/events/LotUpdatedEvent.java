package com.parkinglot.websocket.events;

import com.parkinglot.dto.LotResponse;

public record LotUpdatedEvent(String type, LotResponse lot) {
    public LotUpdatedEvent(LotResponse lot) {
        this("LOT_UPDATED", lot);
    }
}
