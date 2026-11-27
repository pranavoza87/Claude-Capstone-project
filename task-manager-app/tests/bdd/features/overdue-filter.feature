Feature: Overdue quick filter (EPMCDMETST-73342)
  A "Show overdue only" toggle limits the list to overdue tasks, using the same
  rule as the Overdue label. All fixtures are created through the API and dates
  are relative to the (mocked) browser clock. Assertions are scoped to this
  scenario's own task titles.

  Scenario: The filter is off by default
    Given the browser clock is set to local noon today
    And a "todo" task labelled "past" exists with a due date 3 days ago
    And a "todo" task labelled "future" exists with a due date 5 days from now
    When I open the task manager
    Then the overdue filter is off
    And the "past" task is listed
    And the "future" task is listed

  Scenario: Turning the filter on shows only overdue tasks
    Given the browser clock is set to local noon today
    And a "todo" task labelled "past" exists with a due date 3 days ago
    And a "todo" task labelled "future" exists with a due date 5 days from now
    And a "done" task labelled "finished" exists with a due date 3 days ago
    And a "todo" task labelled "undated" exists
    And a "todo" task labelled "today" exists with a due date today
    When I open the task manager
    And I turn on the overdue filter
    Then the "past" task is listed
    And the "past" task is marked overdue
    And the "future" task is not listed
    And the "finished" task is not listed
    And the "undated" task is not listed
    And the "today" task is not listed

  Scenario: Turning the filter off restores all tasks
    Given the browser clock is set to local noon today
    And a "todo" task labelled "past" exists with a due date 3 days ago
    And a "todo" task labelled "future" exists with a due date 5 days from now
    And a "done" task labelled "finished" exists with a due date 3 days ago
    And a "todo" task labelled "undated" exists
    And a "todo" task labelled "today" exists with a due date today
    When I open the task manager
    And I turn on the overdue filter
    And I turn off the overdue filter
    Then the overdue filter is off
    And the "past" task is listed
    And the "future" task is listed
    And the "finished" task is listed
    And the "undated" task is listed
    And the "today" task is listed

  Scenario: A filter with no overdue match shows the empty message
    Given the browser clock is set to local noon today
    And a "todo" task labelled "future" exists with a due date 5 days from now
    When I open the task manager
    And I turn on the overdue filter
    And I search for "future"
    Then the empty message "No overdue tasks." is shown
    And the empty message "No overdue tasks." is announced as a status
    And the empty message "No tasks yet." is not shown
    And the "future" task is not listed

  Scenario: The filter combines with the title search
    Given the browser clock is set to local noon today
    And a "todo" task labelled "river" exists with a due date 3 days ago
    And a "todo" task labelled "stone" exists with a due date 3 days ago
    And a "todo" task labelled "pebble" exists with a due date 5 days from now
    When I open the task manager
    And I turn on the overdue filter
    And I search for "river"
    Then the "river" task is listed
    And the "stone" task is not listed
    And the "pebble" task is not listed

  Scenario: A task added with a past due date appears while the filter is on
    Given the browser clock is set to local noon today
    When I open the task manager
    And I turn on the overdue filter
    And I add a task with a due date 2 days ago
    Then the added task is listed
    And the overdue filter is on

  Scenario: Deleting a task while the filter is on keeps the filter
    Given the browser clock is set to local noon today
    And a "todo" task labelled "river" exists with a due date 3 days ago
    And a "todo" task labelled "stone" exists with a due date 3 days ago
    When I open the task manager
    And I turn on the overdue filter
    And I delete the "river" task
    Then the "river" task is not listed
    And the "stone" task is listed
    And the overdue filter is on
