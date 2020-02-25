Feature: A command with parameters
  A command can have different kind of parameters:
  * simple / variadic
  * optional / mandatory

  Scenario: An unknown parameter is provided
    Given a command line named "my-command"
    When I call the command "my-command bar"
    Then it should fail

  Scenario: A simple optional parameter is not provided
    Given a command line named "my-command"
    When I add a parameter "foo"
    And I call the command "my-command"
    Then the key "foo" of the parse result should be undefined

  Scenario: A simple optional parameter is provided
    Given a command line named "my-command"
    When I add a parameter "foo"
    And I call the command "my-command bar"
    Then the key "foo" of the parse result should be set to "bar"

  Scenario: A simple mandatory parameter is not provided
    Given a command line named "my-command"
    When I add a mandatory parameter "foo"
    And I call the command "my-command"
    Then it should fail

  Scenario: A simple mandatory parameter is provided
    Given a command line named "my-command"
    When I add a mandatory parameter "foo"
    And I call the command "my-command bar"
    Then the key "foo" of the parse result should be set to "bar"

  Scenario: Several simple parameters are provided
    Given a command line named "my-command"
    When I add a parameter "foo"
    And I add a mandatory parameter "foo2"
    And I call the command "my-command bar bar2"
    Then the key "foo" of the parse result should be set to "bar"
    And the key "foo2" of the parse result should be set to "bar2"

  Scenario: A variadic optional parameter is not provided
    Given a command line named "my-command"
    When I add a variadic parameter "foo"
    And I call the command "my-command"
    Then the key "foo" of the parse result should be set to an array of 0 element

  Scenario: A variadic optional parameter is provided with one value
    Given a command line named "my-command"
    When I add a variadic parameter "foo"
    And I call the command "my-command bar"
    Then the key "foo" of the parse result should be set to an array of 1 element
    And the key "foo" of the parse result should contain "bar"

  Scenario: A variadic optional parameter is provided with several values
    Given a command line named "my-command"
    When I add a variadic parameter "foo"
    And I call the command "my-command bar baz"
    Then the key "foo" of the parse result should be set to an array of 2 elements
    And the key "foo" of the parse result should contain "bar"
    And the key "foo" of the parse result should contain "baz"

  Scenario: A variadic mandatory parameter is not provided
    Given a command line named "my-command"
    When I add a variadic mandatory parameter "foo"
    And I call the command "my-command"
    Then it should fail

  Scenario: A variadic mandatory parameter is provided with one value
    Given a command line named "my-command"
    When I add a variadic mandatory parameter "foo"
    And I call the command "my-command bar"
    Then the key "foo" of the parse result should be set to an array of 1 element
    And the key "foo" of the parse result should contain "bar"

  Scenario: A variadic mandatory parameter is provided with several values
    Given a command line named "my-command"
    When I add a variadic mandatory parameter "foo"
    And I call the command "my-command bar baz"
    Then the key "foo" of the parse result should be set to an array of 2 elements
    And the key "foo" of the parse result should contain "bar"
    And the key "foo" of the parse result should contain "baz"
  
  Scenario: A simple mandatory parameter is provided and a variadic mandatory parameter is provided with several values
    Given a command line named "my-command"
    When I add a mandatory parameter "foo"
    And I add a variadic mandatory parameter "foo2"
    And I call the command "my-command bar baz qux quux"
    Then the key "foo" of the parse result should be set to "bar"
    And the key "foo2" of the parse result should be set to an array of 3 elements
    And the key "foo2" of the parse result should contain "baz"
    And the key "foo2" of the parse result should contain "qux"
    And the key "foo2" of the parse result should contain "quux"
