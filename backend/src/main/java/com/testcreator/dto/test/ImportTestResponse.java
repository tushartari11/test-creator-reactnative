package com.testcreator.dto.test;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportTestResponse {
    private String testName;
    private Integer durationMinutes;
    private List<QuestionRequest> questions;
    private List<String> errors;
}
