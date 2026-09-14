package com.parkinglot.websocket;

import com.parkinglot.dto.LotResponse;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.websocket.events.LotCreatedEvent;
import com.parkinglot.websocket.events.LotDeletedEvent;
import com.parkinglot.websocket.events.LotUpdatedEvent;
import com.parkinglot.websocket.events.SpotCreatedEvent;
import com.parkinglot.websocket.events.SpotDeletedEvent;
import com.parkinglot.websocket.events.SpotUpdatedEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

// Single broadcast topic by design (spec §6.2/§8) — see WebSocketConfig for the
// scale rationale behind not splitting this into per-lot topics yet.
@Component
public class LotUpdatePublisher {

    private static final String TOPIC = "/topic/lot-updates";

    private final SimpMessagingTemplate template;

    public LotUpdatePublisher(SimpMessagingTemplate template) {
        this.template = template;
    }

    public void publishSpotUpdated(UUID lotId, SpotResponse spot) {
        template.convertAndSend(TOPIC, new SpotUpdatedEvent(lotId, spot));
    }

    public void publishSpotCreated(UUID lotId, SpotResponse spot) {
        template.convertAndSend(TOPIC, new SpotCreatedEvent(lotId, spot));
    }

    public void publishSpotDeleted(UUID lotId, UUID spotId) {
        template.convertAndSend(TOPIC, new SpotDeletedEvent(lotId, spotId));
    }

    public void publishLotCreated(LotResponse lot) {
        template.convertAndSend(TOPIC, new LotCreatedEvent(lot));
    }

    public void publishLotUpdated(LotResponse lot) {
        template.convertAndSend(TOPIC, new LotUpdatedEvent(lot));
    }

    public void publishLotDeleted(UUID lotId) {
        template.convertAndSend(TOPIC, new LotDeletedEvent(lotId));
    }
}
