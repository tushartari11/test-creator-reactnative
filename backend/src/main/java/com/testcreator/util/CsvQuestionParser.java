package com.testcreator.util;

import com.testcreator.dto.test.OptionRequest;
import com.testcreator.dto.test.QuestionRequest;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

/** Parses a CSV file into a list of {@link QuestionRequest} objects. */
@Slf4j
public class CsvQuestionParser {

  /** Parses the CSV file and populates {@code errors} with any row-level problems found. */
  public static List<QuestionRequest> parse(MultipartFile file, List<String> errors) {
    List<QuestionRequest> questions = new ArrayList<>();
    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
      String header = reader.readLine();
      if (header == null || !header.toLowerCase().contains("question_number")) {
        errors.add("CSV header missing or invalid");
        return questions;
      }
      String line;
      int rowNum = 1;
      while ((line = reader.readLine()) != null) {
        rowNum++;
        String[] cols = line.split(",", -1); // -1 to keep trailing empty columns
        if (cols.length < 7) {
          errors.add("Row " + rowNum + ": Not enough columns");
          continue;
        }
        try {
          final int questionNumber = Integer.parseInt(cols[0].trim());
          final String questionText = cols[1].trim();
          List<OptionRequest> options = new ArrayList<>();
          for (int i = 2; i <= 4; i++) {
            options.add(
                OptionRequest.builder().optionNumber(i - 1).optionText(cols[i].trim()).build());
          }
          String correctOptionText = cols[5].trim();
          int correctOptionNumber = -1;
          for (int i = 2; i <= 4; i++) {
            if (cols[i].trim().equalsIgnoreCase(correctOptionText)) {
              correctOptionNumber = i - 1;
              break;
            }
          }
          if (correctOptionNumber == -1) {
            errors.add("Row " + rowNum + ": Correct option not found among options");
            continue;
          }
          String explanation = cols.length > 6 ? cols[6].trim() : "";
          questions.add(
              QuestionRequest.builder()
                  .questionNumber(questionNumber)
                  .questionText(questionText)
                  .explanation(explanation)
                  .options(options)
                  .correctOptionNumber(correctOptionNumber)
                  .build());
        } catch (Exception e) {
          errors.add("Row " + rowNum + ": " + e.getMessage());
        }
      }
    } catch (Exception e) {
      errors.add("Failed to parse CSV: " + e.getMessage());
    }
    return questions;
  }
}
