Feature: Smoke — application health

  The framework is wired correctly and the Expo web build loads in a browser.

  Scenario: Home page renders for an anonymous visitor
    Given the testing framework is configured
    When I open the application home page
    Then the page should load without errors
    And the document should have a non-empty body
