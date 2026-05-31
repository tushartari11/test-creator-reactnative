package com.testcreator.service;

import static org.junit.jupiter.api.Assertions.*;

import com.testcreator.dto.test.ImportTestResponse;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;

@SpringBootTest
class TestServiceCsvImportTest {

  @Autowired private TestService testService;

  @Test
  public void importTestFromCsv_validFile_parsesQuestionsCorrectly() throws Exception {
    // Arrange
    ClassPathResource resource = new ClassPathResource("static/Question_Sheet.csv");
    InputStream is = resource.getInputStream();
    MockMultipartFile file = new MockMultipartFile("file", "Question_Sheet.csv", "text/csv", is);
    String testName = "Sample Test";
    int duration = 30;

    // Act
    ImportTestResponse response = testService.importTestFromCsv(file, testName, duration);

    // Assert
    assertNotNull(response);
    assertEquals(testName, response.getTestName());
    assertEquals(duration, response.getDurationMinutes());
    assertNotNull(response.getQuestions());
    assertTrue(
        response.getErrors() == null || response.getErrors().isEmpty(), "Should have no errors");
    assertEquals(2, response.getQuestions().size());

    // First question
    assertEquals("What colour is an elephant", response.getQuestions().get(0).getQuestionText());
    assertEquals("Black", response.getQuestions().get(0).getOptions().get(0).getOptionText());
    assertEquals(1, response.getQuestions().get(0).getCorrectOptionNumber());
    assertEquals("its his natural colour", response.getQuestions().get(0).getExplanation());

    // Second question
    assertEquals("What colour is an Tree", response.getQuestions().get(1).getQuestionText());
    assertEquals("Green", response.getQuestions().get(1).getOptions().get(2).getOptionText());
    assertEquals(3, response.getQuestions().get(1).getCorrectOptionNumber());
    assertEquals("", response.getQuestions().get(1).getExplanation());
  }
}
