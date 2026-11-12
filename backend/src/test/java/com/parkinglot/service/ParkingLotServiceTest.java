package com.parkinglot.service;

import com.parkinglot.dto.CreateLotRequest;
import com.parkinglot.dto.UpdateLotRequest;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.LotHasOccupiedSpotsException;
import com.parkinglot.exception.LotNameTakenException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.ParkingLotRepository;
import com.parkinglot.repository.ParkingSpotRepository;
import com.parkinglot.websocket.LotUpdatePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ParkingLotServiceTest {

    @Mock ParkingLotRepository lotRepo;
    @Mock ParkingSpotRepository spotRepo;
    @Mock CarAssignmentRepository assignmentRepo;
    @Mock LotUpdatePublisher publisher;

    ParkingLotService service;

    @BeforeEach
    void setUp() {
        ParkingSpotService spotService = new ParkingSpotService(spotRepo, assignmentRepo, publisher);
        service = new ParkingLotService(lotRepo, spotRepo, assignmentRepo, spotService, publisher);
        when(lotRepo.save(any(ParkingLot.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(any())).thenReturn(Optional.empty());
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList())).thenReturn(List.of());
    }

    @Test
    void refusesALotNameThatIsAlreadyTakenIgnoringCase() {
        when(lotRepo.existsByNameIgnoreCase("north garage")).thenReturn(true);

        assertThatThrownBy(() -> service.createLot(new CreateLotRequest("north garage", null)))
            .isInstanceOf(LotNameTakenException.class);
        verify(lotRepo, never()).save(any());
    }

    @Test
    void createsAnEmptyLotAndAnnouncesIt() {
        when(lotRepo.existsByNameIgnoreCase("East Lot")).thenReturn(false);

        var response = service.createLot(new CreateLotRequest("East Lot", null));

        assertThat(response.name()).isEqualTo("East Lot");
        assertThat(response.spots()).isEmpty();
        verify(publisher).publishLotCreated(response);
    }

    @Test
    void renamingALotToAnotherLotsNameIsRefused() {
        ParkingLot lot = TestData.lot("North Garage");
        when(lotRepo.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(lotRepo.existsByNameIgnoreCase("South Deck")).thenReturn(true);

        assertThatThrownBy(() -> service.renameLot(lot.getId(), new UpdateLotRequest("South Deck")))
            .isInstanceOf(LotNameTakenException.class);
        assertThat(lot.getName()).isEqualTo("North Garage");
    }

    @Test
    void changingOnlyTheCapitalisationOfALotsOwnNameIsAllowed() {
        ParkingLot lot = TestData.lot("North Garage");
        when(lotRepo.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(lotRepo.existsByNameIgnoreCase("NORTH GARAGE")).thenReturn(true);

        service.renameLot(lot.getId(), new UpdateLotRequest("NORTH GARAGE"));

        assertThat(lot.getName()).isEqualTo("NORTH GARAGE");
    }

    @Test
    void refusesToDeleteALotWithParkedCars() {
        ParkingLot lot = TestData.lot("North Garage");
        ParkingSpot a1 = TestData.spot(lot, "A", 1);
        TestData.spot(lot, "A", 2);
        when(lotRepo.findById(lot.getId())).thenReturn(Optional.of(lot));
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList()))
            .thenReturn(List.of(TestData.parked(TestData.car("CH-1"), a1)));

        assertThatThrownBy(() -> service.deleteLot(lot.getId()))
            .isInstanceOf(LotHasOccupiedSpotsException.class);
        verify(spotRepo, never()).deleteAll(anyList());
        verify(lotRepo, never()).delete(any());
    }

    @Test
    void deletingAnEmptyLotRemovesItsSpotsFirst() {
        ParkingLot lot = TestData.lot("North Garage");
        TestData.spot(lot, "A", 1);
        TestData.spot(lot, "A", 2);
        when(lotRepo.findById(lot.getId())).thenReturn(Optional.of(lot));

        service.deleteLot(lot.getId());

        // parking_spots.lot_id is ON DELETE RESTRICT, so the order matters.
        InOrder order = inOrder(spotRepo, lotRepo, publisher);
        order.verify(spotRepo).deleteAll(lot.getSpots());
        order.verify(lotRepo).delete(lot);
        order.verify(publisher).publishLotDeleted(lot.getId());
    }
}
