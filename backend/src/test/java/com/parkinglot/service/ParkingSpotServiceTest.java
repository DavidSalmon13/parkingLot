package com.parkinglot.service;

import com.parkinglot.dto.GridRequest;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.dto.UpdateSpotRequest;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.RowFullyOccupiedException;
import com.parkinglot.exception.RowHasOccupiedSpotsException;
import com.parkinglot.exception.SpotLabelTakenException;
import com.parkinglot.exception.SpotOccupiedException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.ParkingSpotRepository;
import com.parkinglot.websocket.LotUpdatePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ParkingSpotServiceTest {

    @Mock ParkingSpotRepository spotRepo;
    @Mock CarAssignmentRepository assignmentRepo;
    @Mock LotUpdatePublisher publisher;

    ParkingSpotService service;
    ParkingLot lot;

    @BeforeEach
    void setUp() {
        service = new ParkingSpotService(spotRepo, assignmentRepo, publisher);
        lot = TestData.lot("North Garage");
        when(spotRepo.save(any(ParkingSpot.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(any())).thenReturn(Optional.empty());
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList())).thenReturn(List.of());
    }

    @Test
    void aSpotWithACarIsOccupiedAndOneWithoutIsAvailable() {
        ParkingSpot spot = TestData.spot(lot, "A", 1);

        SpotResponse free = service.toDto(spot, Optional.empty());
        SpotResponse taken = service.toDto(spot, Optional.of(TestData.parked(TestData.car("CH-1"), spot)));

        assertThat(free.status()).isEqualTo("available");
        assertThat(free.car()).isNull();
        assertThat(taken.status()).isEqualTo("occupied");
        assertThat(taken.car().chassisNumber()).isEqualTo("CH-1");
    }

    @Test
    void growingARowContinuesItsNumbering() {
        when(spotRepo.findMaxPositionByLotIdAndRow(lot.getId(), "A")).thenReturn(Optional.of(3));
        when(spotRepo.findMaxPositionByLotIdAndRow(lot.getId(), "B")).thenReturn(Optional.empty());

        List<SpotResponse> created = service.generateGrid(lot, List.of(
            new GridRequest.RowSpec("A", 2),
            new GridRequest.RowSpec("B", 2)));

        assertThat(created).extracting(SpotResponse::label).containsExactly("A4", "A5", "B1", "B2");
        verify(publisher, times(4)).publishSpotCreated(eq(lot.getId()), any());
    }

    @Test
    void removingASpotFromARowSkipsParkedCarsAtTheEndAndClosesTheGap() {
        ParkingSpot a3 = TestData.spot(lot, "A", 3);
        ParkingSpot a4 = TestData.spot(lot, "A", 4);
        ParkingSpot a5 = TestData.spot(lot, "A", 5);
        when(spotRepo.findByLotIdAndRowOrderByPositionAsc(lot.getId(), "A")).thenReturn(List.of(a3, a4, a5));
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList()))
            .thenReturn(List.of(TestData.parked(TestData.car("CH-1"), a5)));

        service.removeLastAvailableSpotFromRow(lot, "A");

        // A5 is occupied, so the last free spot (A4) goes, and the car's spot becomes A4.
        verify(spotRepo).delete(a4);
        verify(spotRepo, never()).delete(a5);
        assertThat(a5.getPosition()).isEqualTo(4);
        assertThat(a5.getLabel()).isEqualTo("A4");
        assertThat(a3.getLabel()).isEqualTo("A3");
        verify(spotRepo).saveAndFlush(a5);
        verify(publisher).publishSpotDeleted(lot.getId(), a4.getId());
    }

    @Test
    void aRowWhereEverySpotIsTakenCannotShrink() {
        ParkingSpot a1 = TestData.spot(lot, "A", 1);
        when(spotRepo.findByLotIdAndRowOrderByPositionAsc(lot.getId(), "A")).thenReturn(List.of(a1));
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList()))
            .thenReturn(List.of(TestData.parked(TestData.car("CH-1"), a1)));

        assertThatThrownBy(() -> service.removeLastAvailableSpotFromRow(lot, "A"))
            .isInstanceOf(RowFullyOccupiedException.class);
        verify(spotRepo, never()).delete(any());
    }

    @Test
    void aNewRowGetsTheNextUnusedLetter() {
        List<ParkingSpot> existing = List.of(TestData.spot(lot, "A", 1), TestData.spot(lot, "B", 1));
        when(spotRepo.findByLotIdOrderByRowAscPositionAsc(lot.getId())).thenReturn(existing);

        SpotResponse created = service.addRowToLot(lot);

        assertThat(created.row()).isEqualTo("C");
        assertThat(created.label()).isEqualTo("C1");
    }

    @Test
    void theLastRowCannotBeRemovedWhileACarIsParkedInIt() {
        TestData.spot(lot, "A", 1);
        ParkingSpot b1 = TestData.spot(lot, "B", 1);
        when(spotRepo.findByLotIdOrderByRowAscPositionAsc(lot.getId())).thenReturn(List.copyOf(lot.getSpots()));
        when(assignmentRepo.findBySpotIdInAndRemovedAtIsNull(anyList()))
            .thenReturn(List.of(TestData.parked(TestData.car("CH-1"), b1)));

        assertThatThrownBy(() -> service.removeLastRowFromLot(lot))
            .isInstanceOf(RowHasOccupiedSpotsException.class);
        verify(spotRepo, never()).deleteAll(anyList());
    }

    @Test
    void aSpotWithACarCannotBeDeleted() {
        ParkingSpot spot = TestData.spot(lot, "A", 1);
        when(spotRepo.findById(spot.getId())).thenReturn(Optional.of(spot));
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(spot.getId()))
            .thenReturn(Optional.of(TestData.parked(TestData.car("CH-1"), spot)));

        assertThatThrownBy(() -> service.deleteSpot(spot.getId()))
            .isInstanceOf(SpotOccupiedException.class);
        verify(spotRepo, never()).delete(any());
    }

    @Test
    void twoSpotsInTheSameLotCannotShareALabel() {
        ParkingSpot spot = TestData.spot(lot, "A", 1);
        when(spotRepo.findById(spot.getId())).thenReturn(Optional.of(spot));
        when(spotRepo.existsByLotIdAndLabel(lot.getId(), "A2")).thenReturn(true);

        assertThatThrownBy(() -> service.updateSpot(spot.getId(), new UpdateSpotRequest("A2", "A", 2)))
            .isInstanceOf(SpotLabelTakenException.class);
        assertThat(spot.getLabel()).isEqualTo("A1");
    }
}
