Feature: A command with subcommands
  A command can have subcommands

  Scenario: A subcommand is provided
    Given a command line named "my-command"
    When I add a subcommand "my-subcommand"
    And I execute the command "my-command my-subcommand"
    Then it should succeed

  Scenario: A subcommand with options and parameters is provided
    Given a command line named "my-command"
    When I add a subcommand "my-subcommand"
    And I add a flag "a"
    And I add an option "foo" with a parameter "bar"
    And I add a mandatory parameter "qux"
    And I add a variadic mandatory parameter "quux"
    And I execute the command "my-command my-subcommand -a --foo baz abc def ghi jkl"
    Then it should succeed
    And the key "a" of the parse result should be set to true
    And the key "foo" of the parse result should be set to "baz"
    And the key "qux" of the parse result should be set to "abc"
    And the key "quux" of the parse result should be set to an array of 3 elements
    And the key "quux" of the parse result should contain "def"
    And the key "quux" of the parse result should contain "ghi"
    And the key "quux" of the parse result should contain "jkl"

  Scenario: A subcommand with options and parameters is provided with errors
    Given a command line named "my-command"
    When I add a subcommand "my-subcommand"
    And I add a flag "a"
    And I add an option "foo" with a parameter "bar"
    And I add a mandatory parameter "qux"
    And I add a variadic mandatory parameter "quux"
    And I execute the command "my-command my-subcommand -b --foo"
    Then it should fail
    And the error output should be:
      """
      An error occured in command my-command:
          Some errors occured in command my-subcommand:
              Unknown option b in -b.
              A value must be provided for --foo <bar>.
              The parameter <qux> is mandatory.
              The parameter <quux...> is mandatory.
      """

  Scenario: A subcommand with a subcommand with options and parameters is provided
    Given a command line named "my-command"
    When I add a subcommand "my-subcommand"
    And I add a subcommand "my-subsubcommand"
    And I add a flag "a"
    And I add an option "foo" with a parameter "bar"
    And I add a mandatory parameter "qux"
    And I add a variadic mandatory parameter "quux"
    And I execute the command "my-command my-subcommand my-subsubcommand -a --foo baz abc def ghi jkl"
    Then it should succeed
    And the key "a" of the parse result should be set to true
    And the key "foo" of the parse result should be set to "baz"
    And the key "qux" of the parse result should be set to "abc"
    And the key "quux" of the parse result should be set to an array of 3 elements
    And the key "quux" of the parse result should contain "def"
    And the key "quux" of the parse result should contain "ghi"
    And the key "quux" of the parse result should contain "jkl"
