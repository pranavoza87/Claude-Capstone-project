Feature: Optional task due date (US-101)
  Tasks can carry an optional due date. A task past its due date that is not done
  is flagged as overdue. All fixtures are created through the API and dates are
  relative to the (mocked) browser clock.

  Scenario: Add a task with a due date via the UI
    Given the browser clock is set to local noon today
    And I open the task manager
    When I add a task with a due date 10 days from now
    Then the task shows its due date 10 days from now
    And the task is not marked overdue
    And the due date input is empty

  Scenario: Add a task without a due date
    Given the browser clock is set to local noon today
    And I open the task manager
    When I add a task without a due date
    Then the task shows no due date
    And the task is not marked overdue

  Scenario: Past-due task is marked overdue
    Given the browser clock is set to local noon today
    And a "todo" task exists with a due date 3 days ago
    When I open the task manager
    Then the task shows its due date 3 days ago
    And the task is marked overdue

  Scenario: Done task with a past due date is not overdue
    Given the browser clock is set to local noon today
    And a "done" task exists with a due date 3 days ago
    When I open the task manager
    Then the task shows its due date 3 days ago
    And the task is not marked overdue

  Scenario: Task due today is not overdue
    Given the browser clock is set to local noon today
    And a "todo" task exists with a due date today
    When I open the task manager
    Then the task shows its due date today
    And the task is not marked overdue

  Scenario: Task due in the future is not overdue
    Given the browser clock is set to local noon today
    And a "in_progress" task exists with a due date 5 days from now
    When I open the task manager
    Then the task shows its due date 5 days from now
    And the task is not marked overdue

  Scenario: Legacy-style task without a due date shows nothing extra
    Given the browser clock is set to local noon today
    And a "todo" task exists with no due date
    When I open the task manager
    Then the task shows no due date
    And the task is not marked overdue

  Scenario Outline: Overdue flips at local midnight, not UTC midnight
    Given the browser timezone is "<timezone>"
    And the browser clock is set to "<before midnight>"
    And a "todo" task exists with the due date "2026-03-15"
    When I open the task manager
    Then the task is not marked overdue
    When the browser clock moves to "<after midnight>" and I reload the page
    Then the task is marked overdue

    Examples:
      | timezone         | before midnight      | after midnight       |
      | Pacific/Auckland | 2026-03-15T10:59:30Z | 2026-03-15T11:00:30Z |
      | Pacific/Honolulu | 2026-03-16T09:59:30Z | 2026-03-16T10:00:30Z |

  Scenario: API rejects an invalid due date
    When I create a task via the API with due date "2025-02-30"
    Then the API responds with status 400
    And the task is not listed by the API

  Scenario: Add then delete returns the list to its prior state and search still filters
    Given the browser clock is set to local noon today
    And a "todo" task labelled "alpha" exists
    And a "todo" task labelled "beta" exists
    When I open the task manager
    And I note the number of tasks listed
    And I add a task without a due date
    And I delete the task I just added
    Then the number of tasks listed is unchanged
    When I search for "alpha"
    Then only the "alpha" task is listed
