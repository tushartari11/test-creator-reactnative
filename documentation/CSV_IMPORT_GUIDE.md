# CSV Import for Questions & Options: Implementation Guide

This document outlines the steps and code changes required to implement the CSV Import feature for
importing questions and options into the Test Creator application.

---

## 1. Backend Implementation

### a. Add Endpoint to Controller

- Add a new REST endpoint in `TestController`:
    - `@PostMapping("/tests/import-csv")`
    - Accepts a CSV file (multipart), test name, and duration as parameters.
    - Returns a DTO with parsed questions and any errors.

### b. Service Layer Logic

- Add `importTestFromCsv(MultipartFile file, String testName, int duration)` to `TestService`.
- Validate test name and duration.
- Use a CSV parser utility to parse the file.
- Return a DTO with test details and parsed questions.

### c. CSV Parsing Utility

- Create `CsvQuestionParser` in `util/`:
    - Parse CSV rows into `QuestionRequest` and `OptionRequest` objects.
    - Support fields: question text, options, correct answer, explanation.
    - Handle validation and error reporting.

### d. DTOs

- Add/Update DTOs:
    - `ImportTestResponse` (testName, duration, questions, errors)
    - `QuestionRequest` (questionText, options, correctOptionNumber, explanation)
    - `OptionRequest` (optionText, optionNumber)

### e. Unit/Integration Tests

- Add tests for CSV import in `TestServiceCsvImportTest`:
    - Test valid and invalid CSVs.
    - Assert correct parsing and error handling.

---

## 2. Frontend Implementation

### a. Update Test Creation UI

- In `create-test.html`, add a file input for CSV import:
    - `<input type="file" id="csvImportInput" accept=".csv" style="display:none" />`
    - Add a button/label to trigger file selection.

### b. Modular JS: csv-import.js

- Create a new file `csv-import.js` to handle only CSV import logic.
- Wrap logic in `DOMContentLoaded` to ensure DOM is ready.
- In `csv-import.js`, add an event listener for `csvImportInput`:
    - On file selection, validate test details.
    - Call `TeacherTestAPI.importTestFromCsv(file, title, duration)`.
    - On success, dispatch a custom event (`csvQuestionsImported`) with the parsed questions and
      test details.
    - On error, display error message.

### c. Integrate CSV Import Module

- In your HTML, include `csv-import.js` after dependencies (`api.js`, etc.).
- In your main page JS (e.g., `create.js`), listen for the `csvQuestionsImported` event:
  ```js
  document.addEventListener("csvQuestionsImported", function (e) {
    const resp = e.detail;
    // Populate questions array, update UI, etc.
  });
  ```
- This keeps CSV import logic separate and reusable.

### d. API Client

- In `api.js`, add `TeacherTestAPI.importTestFromCsv`:
    - Calls backend endpoint with file and params.
    - Uses `ApiClient.uploadCsv`.

### e. UI Feedback

- Show loading overlay during import (use `UI.showLoading`/`UI.hideLoading`).
- Display errors in `.form-error-message` div.

### f. Expose Navigation Functions

- Ensure `goBackToStep1` and `submitTest` are attached to `window` for HTML `onclick` handlers.

---

## 3. Validation & Error Handling

- Validate test title and duration before import.
- Validate CSV format and required fields.
- Show user-friendly error messages for all failures.

---

## 4. Testing

- Add unit tests for backend CSV parsing and endpoint.
- Manually test frontend import flow with valid/invalid CSVs.

---

## 5. Documentation & Maintenance

- Document CSV format requirements for users.
- Update user manual and API docs.

---

## References

- See `TestController.java`, `TestService.java`, `CsvQuestionParser.java`,
  `ImportTestResponse.java`, `create-test.html`, `create.js`, and `api.js` for implementation
  details.
