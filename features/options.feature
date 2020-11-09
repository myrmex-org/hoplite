Feature: A command with options
    A command can have different kind of options:
    * flags that can be setted
    * options that require a parameter
    * mandatory options that require a parameter

  Scenario: An unknown option is set
    Given a command line named "my-command"
    When I execute the command "my-command -a"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          Unknown option a in -a.
      """

  Scenario: A flag is not set
    Given a command line named "my-command"
    When I add a flag "a"
    And I execute the command "my-command"
    Then it should succeed
    And the key "a" of the parse result should be set to false

  Scenario: A flag is set
    Given a command line named "my-command"
    When I add a flag "a"
    And I execute the command "my-command -a"
    Then it should succeed
    And the key "a" of the parse result should be set to true

  Scenario: A flag is set multiple times
    Given a command line named "my-command"
    When I add a flag "a"
    And I execute the command "my-command -aaa"
    Then it should succeed
    And the key "a" of the parse result should be set to true

  Scenario: Several flags are set at once
    Given a command line named "my-command"
    When I add a flag "a"
    And I add a flag "b"
    And I add a flag "c"
    And I execute the command "my-command -ab"
    Then it should succeed
    And the key "a" of the parse result should be set to true
    And the key "b" of the parse result should be set to true
    And the key "c" of the parse result should be set to false

  Scenario: An mandatory option with parameter is not provided
    Given a command line named "my-command"
    When I add a mandatory option "a" with a parameter "aaa"
    And I execute the command "my-command"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          The option -a <aaa> is mandatory.
      """

  Scenario: An option with a parameter is not provided
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa"
    And I execute the command "my-command"
    Then it should succeed
    And the key "a" of the parse result should be undefined

  Scenario: An option with a parameter is provided
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa"
    And I execute the command "my-command -a toto"
    Then it should succeed
    And the key "a" of the parse result should be set to "toto"

  Scenario: An option with a parameter is provided without the parameter
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa"
    And I execute the command "my-command -a"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          A value must be provided for -a <aaa>.
      """

  Scenario: An mandatory option with a parameter is provided without the parameter
    Given a command line named "my-command"
    When I add a mandatory option "a" with a parameter "aaa"
    And I execute the command "my-command -a"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          A value must be provided for -a <aaa>.
      """

  Scenario: An option with a validated parameter is provided without the parameter
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa" that accepts values "foo,bar,baz"
    And I execute the command "my-command -a"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          A value must be provided for -a <aaa>.
          Allowed values: foo, bar, baz.
      """

  Scenario: An option with a validated parameter is provided with a bad parameter
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa" that accepts values "foo,bar,baz"
    And I execute the command "my-command -a qux"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          qux is not a correct value for -a <aaa>.
          Allowed values: foo, bar, baz.
      """

  Scenario: An option with a parameter provided multiple times takes the latest value
    Given a command line named "my-command"
    When I add an option "a" with a parameter "aaa"
    And I execute the command "my-command -a toto -a titi"
    Then it should succeed
    And the key "a" of the parse result should be set to "titi"

  Scenario: An option with a variadic parameter is not provided
    Given a command line named "my-command"
    When I add an option "a" with a variadic parameter "aaa"
    And I execute the command "my-command"
    Then it should succeed
    And the key "a" of the parse result should be set to an array of 0 element

  Scenario: An option with a variadic parameter is provided once
    Given a command line named "my-command"
    When I add an option "a" with a variadic parameter "aaa"
    And I execute the command "my-command -a toto"
    Then it should succeed
    And the key "a" of the parse result should be set to an array of 1 element
    And the key "a" of the parse result should contain "toto"

  Scenario: An option with a variadic parameter is provided multiple times
    Given a command line named "my-command"
    When I add an option "a" with a variadic parameter "aaa"
    And I execute the command "my-command -a toto -a titi -a tata"
    Then it should succeed
    And the key "a" of the parse result should be set to an array of 3 elements
    And the key "a" of the parse result should contain "toto"
    And the key "a" of the parse result should contain "titi"
    And the key "a" of the parse result should contain "tata"
