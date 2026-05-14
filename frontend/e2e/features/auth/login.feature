@requires-backend
Feature: Authenticated login

  Scenario: Teacher signs in with valid credentials
    Given a teacher "alice" exists with password "Password123"
    When I open the login page
    And I sign in as "alice" with password "Password123"
    Then I land on the teacher dashboard

  Scenario: Login fails with an unknown email
    When I open the login page
    And I sign in as "nobody@e2e.test" with password "Password123"
    Then I see a login error containing "Invalid"
