package com.parkinglot.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Hebrew labels for the DTO field names that show up in validation error
    // details — falls back to the raw field name for anything not mapped here.
    private static final Map<String, String> FIELD_LABELS = Map.ofEntries(
        Map.entry("name", "שם"),
        Map.entry("label", "תווית"),
        Map.entry("row", "שורה"),
        Map.entry("position", "מיקום"),
        Map.entry("chassisNumber", "מספר שלדה"),
        Map.entry("licensePlateNumber", "מספר רישוי"),
        Map.entry("carType", "סוג רכב"),
        Map.entry("clientName", "שם הלקוח"),
        Map.entry("deliveryDate", "תאריך אספקה"),
        Map.entry("carId", "מספר רכב"),
        Map.entry("rows", "שורות"),
        Map.entry("count", "כמות")
    );

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", ex.getErrorCode());
        if (ex.getMessage() != null) {
            body.put("message", ex.getMessage());
        }
        body.putAll(ex.getDetails());
        return ResponseEntity.status(ex.getHttpStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> FIELD_LABELS.getOrDefault(fe.getField(), fe.getField()) + " " + fe.getDefaultMessage())
            .toList();
        String message = "נתונים לא תקינים: " + String.join(", ", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "VALIDATION_ERROR", "message", message, "details", details));
    }

    // Backstop for the race window between a service's pre-check and its insert
    // (spec §7.5/§7.6) — the partial unique indexes are the real guarantee;
    // this just translates the resulting DB error into the right 409 shape.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String cause = String.valueOf(ex.getMostSpecificCause().getMessage());
        if (cause.contains("uq_car_assignments_active_spot")) {
            return handleApiException(new SpotOccupiedException("המקום הזה נתפס הרגע על ידי בקשה אחרת."));
        }
        if (cause.contains("uq_car_assignments_active_car")) {
            return handleApiException(new CarAlreadyParkedException("הרכב הזה שויך הרגע למקום אחר על ידי בקשה אחרת."));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "CONFLICT", "message", "רשומה מתנגשת כבר קיימת."));
    }
}
