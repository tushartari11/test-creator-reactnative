@requires-backend
Feature: New user registration

  Scenario: A new teacher signs up and lands on the teacher dashboard
    When I open the registration page
    And I register as a "TEACHER" named "Reggie Teacher"
    Then I land on the teacher dashboard

  Scenario: Registration fails when passwords do not match
    When I open the registration page
    And I register as a "TEACHER" named "Bad Confirm" with mismatched passwords
    Then I see a registration error containing "Passwords do not match"
