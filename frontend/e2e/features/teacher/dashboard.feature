@requires-backend
Feature: Teacher dashboard

  Scenario: A logged-in teacher with no tests sees their dashboard
    Given a teacher "alice" exists with password "Password123"
    When I open the login page
    And I sign in as "alice" with password "Password123"
    Then I land on the teacher dashboard
    And the dashboard shows my user name
