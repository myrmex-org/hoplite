import { Option } from "../src/option";
import { ParameterValidationError } from "../src/validation";
import { format } from "../src/utils";

describe("The Option class", () => {

  const shortOption = new Option({ short: "a" });
  const longOption = new Option({ long: "bbbbb" });
  const shortLongOption = new Option({ short: "c", long: "ccccc" });
  const shortLongDescriptionOption = new Option({ short: "d", long: "ddddd", description: "dd ddd dddd" });
  const shortLongDescriptionParameterOption = new Option({
    short: "e",
    long: "eeeee",
    description: "ee eee eeee",
    parameter: {
      name: "e-param",
      description: "the parameter from option e",
    }
  });
  const shortDescriptionParameterMandatoryOption = new Option({
    short: "f",
    description: "ff fff ffff",
    parameter: {
      name: "f-param",
      description: "the parameter from option f",
    },
    mandatory: true
  });
  const longVariadicParameterOption = new Option({
    long: "ggggg",
    parameter: {
      name: "g-param",
      description: "the parameter from option g",
      variadic: true
    }
  });
  const shortIntegerParameterOption = new Option({
    short: "h",
    description: "hh hhh hhhh",
    parameter: {
      name: "h-param",
      description: "the parameter from option h",
      validator: (value) => {
        return Promise.resolve(/^[0-9]+$/.test(value));
      }
    },
    mandatory: true
  });

  it("should not be instanciated without a a short or a long variation", () => {
    expect(() => new Option({})).toThrowError("An option should have a least one short name or one long name.");
  }) 

  describe("getName() method", () => {
    it("should return the long name if it exists", () => {
      expect(longOption.getName()).toEqual("bbbbb");
      expect(shortLongOption.getName()).toEqual("ccccc");
    });
    it("should return the short name if long does not exist", () => {
      expect(shortOption.getName()).toEqual("a");
    });
  })

  describe("getUsage() method", () => {
    test.each([
      [ shortOption, "-a" ],
      [ longOption, "--bbbbb" ],
      [ shortLongOption, "-c, --ccccc" ],
      [ shortLongDescriptionOption, "-d, --ddddd" ],
      [ shortLongDescriptionParameterOption, "-e, --eeeee [e-param]" ]
    ])("should get %s usage", (option: Option, expected: string) => {
      expect(option.getUsage()).toEqual(expected);
    });
  });

  describe("getHelpParts() method", () => {
    test.each([
      [ shortOption, { usage: "-a", description: undefined } ],
      [ longOption, { usage: "--bbbbb", description: undefined } ],
      [ shortLongOption, { usage: "-c, --ccccc", description: undefined } ],
      [ shortLongDescriptionOption, { usage: "-d, --ddddd", description: "dd ddd dddd" } ],
      [ shortLongDescriptionParameterOption, { usage: "-e, --eeeee [e-param]", description: "ee eee eeee" } ]
    ])("should get %s help parts", (option: Option, expected: object) => {
      const parts = option.getHelpParts();
      expect(parts).toEqual(expected);
    });
  });

  describe("isMandatory() method", () => {
    it("should inform if the option is mandatory or not", () => {
      expect(shortOption.isMandatory()).toBe(false);
      expect(shortDescriptionParameterMandatoryOption.isMandatory()).toBe(true);
    })
  })


  describe("doesAcceptMultipleValues() method", () => {
    it("should return false if the option has no parameter", () => {
      expect(shortOption.doesAcceptMultipleValues()).toBe(false);
    });
    it("should return false if the option has a non variadic parameter", () => {
      expect(shortLongDescriptionParameterOption.doesAcceptMultipleValues()).toBe(false);
    });
    it("should return false if the option has a variadic parameter", () => {
      expect(longVariadicParameterOption.doesAcceptMultipleValues()).toBe(true);
    });
  });

  describe("setValue() and getValue() methods", () => {
    it("should set a boolean value if there is no parameter", () => {
      shortOption.setValue(["argv1", "argv2"])
      expect(shortOption.getValue()).toBe(true);
    });
    it("should set a string value if there is a string parameter", () => {
      shortLongDescriptionParameterOption.setValue(["argv1", "argv2"]);
      expect(shortLongDescriptionParameterOption.getValue()).toBe("argv1");
    });
    it("should set an array value if there is a variadic parameter", () => {
      longVariadicParameterOption.setValue(["argv1", "argv2"]);
      longVariadicParameterOption.setValue(["argv3", "argv4"]);
      expect(longVariadicParameterOption.getValue()).toEqual([ "argv1", "argv3" ]);
    });
  });

  describe("validate() method", () => {
    it("should validate if the parameter is correct", async () => {
      shortIntegerParameterOption.setValue(["123", "argv2"]);
      await expect(shortIntegerParameterOption.validate()).resolves.toEqual({ success: true });
    });
    it("should not validate if the parameter is not correct", async () => {
      shortIntegerParameterOption.setValue(["argv1", "argv2"]);
      const validationResult = await shortIntegerParameterOption.validate();
      expect(validationResult.success).toEqual(false);
      expect(validationResult.error).toBeInstanceOf(ParameterValidationError);
      expect(validationResult.error.getOutput()).toContain(`${format.error("argv1")} is not a correct value for ${format.cmd("-h [h-param]")}.`);
    });
  });

});
