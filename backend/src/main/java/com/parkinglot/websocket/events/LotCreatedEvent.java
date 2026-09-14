package com.parkinglot.websocket.events;

import com.parkinglot.dto.LotResponse;

public record LotCreatedEvent(String type, LotResponse lot) {
    public LotCreatedEvent(LotResponse lot) {
        this("LOT_CREATED", lot);
    }
}
