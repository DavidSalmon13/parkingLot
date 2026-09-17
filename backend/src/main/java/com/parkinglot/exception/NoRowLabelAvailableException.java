package com.parkinglot.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class NoRowLabelAvailableException extends ApiException {

    public NoRowLabelAvailableException() {
        super("NO_ROW_LABEL_AVAILABLE", HttpStatus.CONFLICT,
            "כל האותיות A-Z כבר בשימוש בחניון זה — יש להוסיף שורה עם תווית מותאמת אישית דרך הניהול.", Map.of());
    }
}
