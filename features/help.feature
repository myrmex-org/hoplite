Feature: Generating help flag
  A "help" flag must be automatically created for a command

  Scenario:
    Given a command line named "my-command"
    When I call the command "my-command --help"
    Then it should succeed
    And the key "help" of the parse result should be set to true
    And the standard output should be:
      """

      Usage: my-command [OPTIONS]

      Options:
        --help    show command usage

      """

  Scenario:
    Given a command line named "my-command"
    When I add a flag "a"
    And I call the command "my-command --help"
    Then it should succeed
    And the key "help" of the parse result should be set to true
    And the standard output should be:
      """

      Usage: my-command [OPTIONS]

      Options:
        --help    show command usage
        -a

      """

  Scenario:
    Given a command line named "my-command"
    When I add a flag "a"
    And I add an option "foo" with a parameter "bar"
    And I add an option "qux" with a variadic parameter "quux"
    And I set its description to "give a quux value for the qux option"
    And I call the command "my-command --help"
    Then it should succeed
    And the key "help" of the parse result should be set to true
    And the standard output should be:
      """

      Usage: my-command [OPTIONS]

      Options:
        --help             show command usage
        -a
        --foo <bar>
        --qux <quux...>    give a quux value for the qux option

      """

  Scenario:
    Given a command line named "my-command"
    When I add a mandatory parameter "foo"
    And I add a variadic parameter "foo2"
    And I call the command "my-command --help"
    Then it should succeed
    And the key "help" of the parse result should be set to true
    And the standard output should be:
      """

      Usage: my-command [OPTIONS] <foo> [foo2...]

      Options:
        --help    show command usage

      Parameters:
        <foo>
        [foo2...]

      """

  Scenario:
    Given a command line named "my-command"
    When I add a flag "a"
    And I add an option "foo" with a parameter "unique-foo"
    And I add an option "bar" with a variadic parameter "multiple-bar"
    And I add a mandatory parameter "baz"
    And I add a variadic parameter "qux"
    And I call the command "my-command --help"
    Then it should succeed
    And the key "help" of the parse result should be set to true
    And the standard output should be:
      """

      Usage: my-command [OPTIONS] <baz> [qux...]

      Options:
        --help                     show command usage
        -a
        --foo <unique-foo>
        --bar <multiple-bar...>

      Parameters:
        <baz>
        [qux...]

      """
