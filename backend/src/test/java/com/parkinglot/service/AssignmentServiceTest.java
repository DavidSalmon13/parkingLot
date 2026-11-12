package com.parkinglot.service;

import com.parkinglot.dto.AssignCarRequest;
import com.parkinglot.dto.AssignmentResponse;
import com.parkinglot.dto.SpotResponse;
import com.parkinglot.entity.Car;
import com.parkinglot.entity.CarAssignment;
import com.parkinglot.entity.ParkingLot;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.CarAlreadyParkedException;
import com.parkinglot.exception.CarIdExistsException;
import com.parkinglot.exception.CarNotFoundException;
import com.parkinglot.exception.SpotNotOccupiedException;
import com.parkinglot.exception.SpotOccupiedException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.CarRepository;
import com.parkinglot.repository.ParkingSpotRepository;
import com.parkinglot.websocket.LotUpdatePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssignmentServiceTest {

    @Mock CarRepository carRepo;
    @Mock CarAssignmentRepository assignmentRepo;
    @Mock ParkingSpotRepository spotRepo;
    @Mock LotUpdatePublisher publisher;

    AssignmentService service;
    ParkingLot lot;
    ParkingSpot spot;

    @BeforeEach
    void setUp() {
        ParkingSpotService spotService = new ParkingSpotService(spotRepo, assignmentRepo, publisher);
        service = new AssignmentService(carRepo, assignmentRepo, spotService, publisher);
        lot = TestData.lot("North Garage");
        spot = TestData.spot(lot, "A", 1);
        when(spotRepo.findById(spot.getId())).thenReturn(Optional.of(spot));
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(any())).thenReturn(Optional.empty());
        when(assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull(any())).thenReturn(Optional.empty());
        when(assignmentRepo.save(any(CarAssignment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(carRepo.save(any(Car.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void parksAnExistingCarInAFreeSpot() {
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(TestData.car("CH-1")));

        AssignmentResponse response = service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-1", null));

        assertThat(response.carId()).isEqualTo("CH-1");
        assertThat(response.spotId()).isEqualTo(spot.getId());
        assertThat(response.lotName()).isEqualTo("North Garage");
        assertThat(response.spotLabel()).isEqualTo("A1");
        verify(assignmentRepo).save(any(CarAssignment.class));
    }

    @Test
    void tellsEveryoneViewingTheLotThatTheSpotIsNowOccupied() {
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(TestData.car("CH-1")));

        service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-1", null));

        ArgumentCaptor<SpotResponse> update = ArgumentCaptor.forClass(SpotResponse.class);
        verify(publisher).publishSpotUpdated(eq(lot.getId()), update.capture());
        assertThat(update.getValue().status()).isEqualTo("occupied");
        assertThat(update.getValue().car().chassisNumber()).isEqualTo("CH-1");
    }

    @Test
    void registersANewCarAndParksItInOneStep() {
        when(carRepo.findById("CH-NEW")).thenReturn(Optional.empty());
        var details = new AssignCarRequest.NewCarDetails("12-345-67", "Sedan", "Dana", null, null);

        service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-NEW", details));

        ArgumentCaptor<Car> saved = ArgumentCaptor.forClass(Car.class);
        verify(carRepo).save(saved.capture());
        assertThat(saved.getValue().getChassisNumber()).isEqualTo("CH-NEW");
        assertThat(saved.getValue().getCarType()).isEqualTo("Sedan");
        verify(assignmentRepo).save(any(CarAssignment.class));
    }

    @Test
    void refusesASpotThatAlreadyHasACar() {
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(TestData.car("CH-1")));
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(spot.getId()))
            .thenReturn(Optional.of(TestData.parked(TestData.car("CH-OTHER"), spot)));

        assertThatThrownBy(() -> service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-1", null)))
            .isInstanceOf(SpotOccupiedException.class);
        verify(assignmentRepo, never()).save(any());
        verify(publisher, never()).publishSpotUpdated(any(), any());
    }

    @Test
    void refusesACarThatIsAlreadyParkedSomewhereElse() {
        Car car = TestData.car("CH-1");
        ParkingSpot otherSpot = TestData.spot(TestData.lot("South Deck"), "B", 4);
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(car));
        when(assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull("CH-1"))
            .thenReturn(Optional.of(TestData.parked(car, otherSpot)));

        assertThatThrownBy(() -> service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-1", null)))
            .isInstanceOf(CarAlreadyParkedException.class);
        verify(assignmentRepo, never()).save(any());
    }

    @Test
    void refusesAnUnknownCarWhenNoNewCarDetailsAreGiven() {
        when(carRepo.findById("CH-MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-MISSING", null)))
            .isInstanceOf(CarNotFoundException.class);
        verify(assignmentRepo, never()).save(any());
    }

    @Test
    void refusesToRegisterANewCarWithAChassisNumberThatAlreadyExists() {
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(TestData.car("CH-1")));
        var details = new AssignCarRequest.NewCarDetails(null, "Sedan", null, null, null);

        assertThatThrownBy(() -> service.assignCarToSpot(spot.getId(), new AssignCarRequest("CH-1", details)))
            .isInstanceOf(CarIdExistsException.class);
        verify(carRepo, never()).save(any());
        verify(assignmentRepo, never()).save(any());
    }

    @Test
    void removingACarEndsItsAssignmentInsteadOfDeletingIt() {
        CarAssignment active = TestData.parked(TestData.car("CH-1"), spot);
        when(assignmentRepo.findBySpotIdAndRemovedAtIsNull(spot.getId())).thenReturn(Optional.of(active));

        service.removeCarFromSpot(spot.getId());

        assertThat(active.getRemovedAt()).isNotNull();
        verify(assignmentRepo, never()).delete(any());
        ArgumentCaptor<SpotResponse> update = ArgumentCaptor.forClass(SpotResponse.class);
        verify(publisher).publishSpotUpdated(eq(lot.getId()), update.capture());
        assertThat(update.getValue().status()).isEqualTo("available");
    }

    @Test
    void removingACarFromAnEmptySpotIsAnError() {
        assertThatThrownBy(() -> service.removeCarFromSpot(spot.getId()))
            .isInstanceOf(SpotNotOccupiedException.class);
    }
}
