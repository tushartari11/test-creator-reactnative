package com.testcreator.dto.test;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response DTO for test import operation. */
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
