package com.parkinglot.service;

import com.parkinglot.dto.CarDetailResponse;
import com.parkinglot.dto.CreateCarRequest;
import com.parkinglot.entity.Car;
import com.parkinglot.entity.ParkingSpot;
import com.parkinglot.exception.CarCurrentlyParkedException;
import com.parkinglot.exception.CarIdExistsException;
import com.parkinglot.exception.CarNotFoundException;
import com.parkinglot.repository.CarAssignmentRepository;
import com.parkinglot.repository.CarRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CarServiceTest {

    @Mock CarRepository carRepo;
    @Mock CarAssignmentRepository assignmentRepo;

    CarService service;

    @BeforeEach
    void setUp() {
        service = new CarService(carRepo, assignmentRepo);
        when(carRepo.save(any(Car.class))).thenAnswer(inv -> inv.getArgument(0));
        when(assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull(any())).thenReturn(Optional.empty());
    }

    @Test
    void registersACarWithoutASpot() {
        when(carRepo.existsById("CH-1")).thenReturn(false);

        CarDetailResponse response = service.createCar(new CreateCarRequest("CH-1", null, "SUV", null, null, null));

        verify(carRepo).save(any(Car.class));
        assertThat(response.currentLocation()).isNull();
    }

    @Test
    void refusesADuplicateChassisNumber() {
        when(carRepo.existsById("CH-1")).thenReturn(true);

        assertThatThrownBy(() -> service.createCar(new CreateCarRequest("CH-1", null, "SUV", null, null, null)))
            .isInstanceOf(CarIdExistsException.class);
        verify(carRepo, never()).save(any());
    }

    @Test
    void refusesToDeleteACarThatIsStillParked() {
        Car car = TestData.car("CH-1");
        ParkingSpot spot = TestData.spot(TestData.lot("North Garage"), "A", 3);
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(car));
        when(assignmentRepo.findByCar_ChassisNumberAndRemovedAtIsNull("CH-1"))
            .thenReturn(Optional.of(TestData.parked(car, spot)));

        assertThatThrownBy(() -> service.deleteCar("CH-1"))
            .isInstanceOf(CarCurrentlyParkedException.class);
        verify(carRepo, never()).delete(any());
    }

    @Test
    void deletesACarThatIsNotParked() {
        Car car = TestData.car("CH-1");
        when(carRepo.findById("CH-1")).thenReturn(Optional.of(car));

        service.deleteCar("CH-1");

        verify(carRepo).delete(car);
    }

    @Test
    void deletingAnUnknownCarIsAnError() {
        when(carRepo.findById("CH-MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteCar("CH-MISSING"))
            .isInstanceOf(CarNotFoundException.class);
    }

    @Test
    void aCarWithoutAnEmojiGetsTheDefaultOne() {
        assertThat(new Car("CH-1", null, "SUV", null, null, null).getEmoji()).isEqualTo(Car.DEFAULT_EMOJI);
        assertThat(new Car("CH-2", null, "SUV", null, null, "   ").getEmoji()).isEqualTo(Car.DEFAULT_EMOJI);
        assertThat(new Car("CH-3", null, "SUV", null, null, " 🚙 ").getEmoji()).isEqualTo("🚙");
    }
}
