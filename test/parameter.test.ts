import { ParameterValidationError } from "../src/errors";
import { Parameter, ParameterArg, ParameterValidator, simpleValidator } from "../src/parameter";
import { format } from "../src/utils";

describe("A simple Parameter", () => {
  let parameter: Parameter;
  it("should be instanciated", () => {
    parameter = new Parameter({ name: "parameter-name" });
    expect(parameter).toBeInstanceOf(Parameter);
  });
  describe("getUsage()", () => {
    it("should return the usage", () => {
      expect(parameter.getUsage()).toEqual("[parameter-name]");
    });
  });
  describe("getHelpParts()", () => {
    it("should return the help parts", () => {
      const parts = parameter.getHelpParts();
      expect(parts.usage).toEqual("[parameter-name]");
      expect(parts.description).toBeUndefined();
    });
  });
  describe("validate()", () => {
    it("should return true", async () => {
      await expect(parameter.validate("unicorn")).resolves.toEqual(true);
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
