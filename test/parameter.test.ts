import { EOL } from 'os';
import { HelpParts } from '../src/base-component';
import { ParameterValidationError, ValidationError, VariadicParameterValidationError } from '../src/validation';
import { Parameter } from '../src/parameter';
import { format } from '../src/utils';

describe('The Parameter Class', () => {
  const simpleParameter = new Parameter({ name: 'simple-parameter' });
  const simpleMandatoryParameter = new Parameter({ name: 'simple-mandatory-parameter', mandatory: true });
  const variadicParameter = new Parameter({
    name: 'variadic-parameter',
    variadic: true,
  });
  const variadicMandatoryParameter = new Parameter({
    name: 'variadic-mandatory-parameter',
    variadic: true,
    mandatory: true,
    description: 'must provide several values',
  });
  const integerParameter = new Parameter({
    name: 'integer-parameter',
    validator: (value: string) => Promise.resolve(/[0-9]+/.test(value)),
  });
  const dynamicAllowedValuesParameter = new Parameter({
    name: 'dynamic-allowed-values-parameter',
    description: 'gets allowed values from filesystem or internet',
    validator: () => Promise.resolve(['a', 'b', 'c', 'd']),
  });

  describe('getUsage() method', () => {
    test.each([
      [simpleParameter, '[simple-parameter]'],
      [simpleMandatoryParameter, '<simple-mandatory-parameter>'],
      [variadicParameter, '[variadic-parameter...]'],
      [variadicMandatoryParameter, '<variadic-mandatory-parameter...>'],
      [integerParameter, '[integer-parameter]'],
      [dynamicAllowedValuesParameter, '[dynamic-allowed-values-parameter]'],
    ])('should get %s usage', (parameter: Parameter, expected: string) => {
      expect(parameter.getUsage()).toEqual(expected);
    });
  });

  describe('getHelpParts() method', () => {
    type TestTuple = [Parameter, HelpParts];
    test.each<TestTuple>([
      [simpleParameter, { usage: '[simple-parameter]', description: undefined }],
      [simpleMandatoryParameter, { usage: '<simple-mandatory-parameter>', description: undefined }],
      [variadicParameter, { usage: '[variadic-parameter...]', description: undefined }],
      [variadicMandatoryParameter, { usage: '<variadic-mandatory-parameter...>', description: 'must provide several values' }],
      [integerParameter, { usage: '[integer-parameter]', description: undefined }],
      [dynamicAllowedValuesParameter, { usage: '[dynamic-allowed-values-parameter]', description: 'gets allowed values from filesystem or internet' }],
    ])('should get %s help parts', (parameter: Parameter, expected: HelpParts) => {
      expect(parameter.getHelpParts()).toEqual(expected);
    });
  });

  describe('setValue() method', () => {
    it('sets a single value for a simple parameter', () => {
      simpleParameter.setValue('abc');
      expect(simpleParameter.getValue()).toEqual('abc');
      simpleParameter.setValue('def');
      expect(simpleParameter.getValue()).toEqual('def');
    });

    it('sets several values for a simple parameter', () => {
      variadicParameter.setValue('abc');
      expect(variadicParameter.getValue()).toEqual(['abc']);
      variadicParameter.setValue('def');
      expect(variadicParameter.getValue()).toEqual(['abc', 'def']);
    });
  });

  describe('validate() method', () => {
    it('should return a success result if the value is valid', async () => {
      await expect(simpleParameter.validate({})).resolves.toEqual(true);
    });
  });
});

describe('A complex Parameter', () => {
  let parameter: Parameter;
  it('should be instanciated', () => {
    parameter = new Parameter({
      name: 'parameter-name',
      description: 'beautiful',
      mandatory: true,
      variadic: true,
      validator: (value: string) => {
        if (/unicorn/.test(value)) {
          return Promise.resolve(true);
        }
        return Promise.resolve(new ParameterValidationError('<parameter-name...>', value, 'Only unicorn is accepted!'));
      },
    });
    expect(parameter).toBeInstanceOf(Parameter);
  });
  describe('getUsage() method', () => {
    it('should return the usage', () => {
      expect(parameter.getUsage()).toEqual('<parameter-name...>');
    });
  });
  describe('getHelpParts() method', () => {
    it('should return the help parts', () => {
      const parts = parameter.getHelpParts();
      expect(parts.usage).toEqual('<parameter-name...>');
      expect(parts.description).toEqual('beautiful');
    });
  });
  describe('validate() method', () => {
    it('should return a success result if the value is valid', async () => {
      parameter.setValue('unicorn');
      await expect(parameter.validate({})).resolves.toEqual(true);
    });
    it('should return a fail result if the value is not valid', async () => {
      parameter.setValue('horse');
      const validationResult = await parameter.validate({});
      expect(validationResult).toBeInstanceOf(ParameterValidationError);
      expect((validationResult as ValidationError).getOutput()).toEqual(
        `${format.error('horse')} is not a correct value for ${format.cmd('<parameter-name...>')}.${EOL}`
        + '    Only unicorn is accepted!',
      );

      parameter.setValue('donkey');
      const validationResult2 = await parameter.validate({});
      expect(validationResult2).toBeInstanceOf(VariadicParameterValidationError);
      const errorMessage = `Some values provided for ${format.cmd('<parameter-name...>')} are not valid: `
                           + `${format.error('horse')}, ${format.error('donkey')}.${EOL}`
                           + '    Only unicorn is accepted!';
      expect((validationResult2 as ValidationError).getOutput()).toEqual(errorMessage);
    });
  });
});
