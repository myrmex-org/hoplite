Feature: A command with options
  A command can have different kind of options:
  * flags that can be setted
  * options that require a parameter
  * mandatory options that require a parameter

  # Scenario: An unknown option is set
  #   Given a command line named "my-command"
  #   When I call the command "my-command -a"
  #   Then I should see an error

  Scenario: A flag is not set
    Given a command line named "my-command"
    When I add a flag "a"
    And I call the command "my-command"
    Then the key "a" of the parse result should be set to false

  Scenario: A flag is set
    Given a command line named "my-command"
    When I add a flag "a"
    And I call the command "my-command -a"
    Then the key "a" of the parse result should be set to true

  Scenario: A flag is set multiple times
    Given a command line named "my-command"
    When I add a flag "a"
    And I call the command "my-command -aaa"
    Then the key "a" of the parse result should be set to true

  Scenario: Several flags are set at once
    Given a command line named "my-command"
    When I add a flag "a"
    And I add a flag "b"
    And I add a flag "c"
    And I call the command "my-command -ab"
    Then the key "a" of the parse result should be set to true
    And the key "b" of the parse result should be set to true
    And the key "c" of the parse result should be set to false

  Scenario: An option with a parameter is not provided
    Given a command line named "my-command"
    When I add an option with a parameter "a"
    And I call the command "my-command"
    Then the key "a" of the parse result should be undefined

  Scenario: An option with a parameter is provided
    Given a command line named "my-command"
    When I add an option with a parameter "a"
    And I call the command "my-command -a toto"
    Then the key "a" of the parse result should be set to "toto"

  Scenario: An option with a parameter provided multiple times takes the latest value 
    Given a command line named "my-command"
    When I add an option with a parameter "a"
    And I call the command "my-command -a toto -a titi"
    Then the key "a" of the parse result should be set to "titi"

  Scenario: An option with a variadic parameter is not provided
    Given a command line named "my-command"
    When I add an option with a variadic parameter "a"
    And I call the command "my-command"
    Then the key "a" of the parse result should be undefined

  Scenario: An option with a variadic parameter is provided once
    Given a command line named "my-command"
    When I add an option with a variadic parameter "a"
    And I call the command "my-command -a toto"
    Then the key "a" of the parse result should be set to an array of 1 element
    And the key "a" of the parse result should contain "toto"

  Scenario: An option with a variadic parameter is provided multiple times
    Given a command line named "my-command"
    When I add an option with a variadic parameter "a"
    And I call the command "my-command -a toto -a titi -a tata"
    Then the key "a" of the parse result should be set to an array of 3 elements
    And the key "a" of the parse result should contain "toto"
    And the key "a" of the parse result should contain "titi"
    And the key "a" of the parse result should contain "tata"
