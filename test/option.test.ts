import { Option } from "../src/option";

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
      validator: (value) => Promise.resolve(/[0-9]+/.test(value))
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
    ])("should get %o usage", (option: Option, expected: string) => {
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
    ])("should get %o help parts", (option: Option, expected: object) => {
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

  describe("resolve() method", () => {
    it("should give a boolean as result if there is no parameter", async () => {
      await expect(shortOption.resolve(["argv1", "argv2"], {})).resolves.toBe(true);
    });
    it("should give a string as result if there is a string parameter", async () => {
      await expect(shortLongDescriptionParameterOption.resolve(["argv1", "argv2"], {})).resolves.toBe("argv1");
    });
    it.skip("should give an array as result if there is a variadic parameter", async () => {
      await expect(longVariadicParameterOption.resolve(["argv1", "argv2"], {})).resolves.toBe([ "argv1" ]);
    });
    it.skip("should throw an error if the parameter does not validate", async () => {
      await expect(shortIntegerParameterOption.resolve(["argv1", "argv2"], {})).rejects.toThrow();
    });
  });

});