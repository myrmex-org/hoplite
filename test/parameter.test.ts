import { ParameterValidationError } from "../src/errors";
import { Parameter, simpleValidator } from "../src/parameter";
import { format } from "../src/utils";

describe("The Parameter Class", () => {
  const simpleParameter = new Parameter({ name: "simple-parameter" });
  const simpleMandatoryParameter = new Parameter({ name: "simple-mandatory-parameter", mandatory: true });
  const variadicParameter = new Parameter({
    name: "variadic-parameter",
    variadic: true
  });
  const variadicMandatoryParameter = new Parameter({
    name: "variadic-mandatory-parameter",
    variadic: true,
    mandatory: true,
    description: "must provide several values"
  });
  const integerParameter = new Parameter({
    name: "integer-parameter",
    validator: (value) => Promise.resolve(/[0-9]+/.test(value))
  });
  const dynamicAllowedValuesParameter = new Parameter({
    name: "dynamic-allowed-values-parameter",
    description: "gets allowed values from filesystem or internet",
    getAllowedValues: (otherParameterValues) => Promise.resolve(['a', 'b', 'c', 'd'])
  });

  describe("getUsage() method", () => {
    test.each([
      [ simpleParameter, "[simple-parameter]" ],
      [ simpleMandatoryParameter, "<simple-mandatory-parameter>" ],
      [ variadicParameter, "[variadic-parameter...]" ],
      [ variadicMandatoryParameter, "<variadic-mandatory-parameter...>" ],
      [ integerParameter, "[integer-parameter]" ],
      [ dynamicAllowedValuesParameter, "[dynamic-allowed-values-parameter]" ]
    ])("should get %o usage", (parameter: Parameter, expected: string) => {
      expect(parameter.getUsage()).toEqual(expected);
    });
  });

  describe("getHelpParts()", () => {
    test.each([
      [ simpleParameter, { usage: "[simple-parameter]", description: undefined }],
      [ simpleMandatoryParameter, { usage: "<simple-mandatory-parameter>", description: undefined } ],
      [ variadicParameter, { usage: "[variadic-parameter...]", description: undefined } ],
      [ variadicMandatoryParameter, { usage: "<variadic-mandatory-parameter...>", description: "must provide several values" } ],
      [ integerParameter, { usage: "[integer-parameter]", description: undefined } ],
      [ dynamicAllowedValuesParameter, { usage: "[dynamic-allowed-values-parameter]", description: "gets allowed values from filesystem or internet" } ]
    ])("should get %o help parts", (parameter: Parameter, expected: object) => {
      expect(parameter.getHelpParts()).toEqual(expected);
    });
  });

  describe("setValue()", () => {
    it("sets a single value for a simple parameter", () => {
      simpleParameter.setValue('abc');
      expect(simpleParameter.getValue()).toEqual('abc');
    });


    it("sets several values for a simple parameter", () => {
      variadicParameter.setValue('abc');
      expect(variadicParameter.getValue()).toEqual(['abc']);
      variadicParameter.setValue('def');
      expect(variadicParameter.getValue()).toEqual(['abc', 'def']);
    });
  })

  describe("validate()", () => {
    it("should return true", async () => {
      await expect(simpleParameter.validate("unicorn")).resolves.toEqual(true);
    });
  });
});


describe("A complex Parameter", () => {
  let parameter: Parameter;
  it("should be instanciated", () => {
    parameter = new Parameter({
      name: "parameter-name",
      description: "beautiful",
      mandatory: true,
      variadic: true,
      validator: (value) => Promise.resolve(/unicorn/.test(value)),
    });
    expect(parameter).toBeInstanceOf(Parameter);
  });
  describe("getUsage()", () => {
    it("should return the usage", () => {
        expect(parameter.getUsage()).toEqual("<parameter-name...>");
    });
  });
  describe("getHelpParts()", () => {
    it("should return the help parts", () => {
        const parts = parameter.getHelpParts();
        expect(parts.usage).toEqual("<parameter-name...>");
        expect(parts.description).toEqual("beautiful");
    });
  });
  describe("validate()", () => {
    it("should return true", async () => {
      await expect(parameter.validate("unicorn")).resolves.toEqual(true);
    });
    it("should return false", async () => {
      await expect(parameter.validate("horse")).resolves.toEqual(false);
    });
  });
});

describe("simpleValidator", () => {
  it("should return a validator", async () => {
    const validator = simpleValidator(["rainbow", "unicorn"]);
    await expect(validator("unicorn")).resolves.toEqual(true);
    await expect(validator("horse")).rejects.toThrow(ParameterValidationError);
    await expect(validator("horse")).rejects.toThrow(
      `${format.error("horse")} is not a correct value. Possible values: ${format.info("rainbow")}, ${format.info("unicorn")}.`,
    );
    await expect(validator("unicorn", "--magical")).resolves.toEqual(true);
    await expect(validator("horse", "--magical")).rejects.toThrow(ParameterValidationError);
    await expect(validator("horse", "--magical")).rejects.toThrow(
      `${format.error("horse")} is not a correct value for ${format.cmd("--magical")}. Possible values: ${format.info("rainbow")}, ${format.info("unicorn")}.`,
    );
  });
});
