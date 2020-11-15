#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { Command } from '../src/command';
import { ParameterValidationError } from '../src/validation';

const pizza = new Command({
  name: 'pizza',
  options: [
    {
      short: 'b',
      long: 'base',
      description: 'Select the base of the pizza',
      mandatory: true,
      parameter: {
        name: 'tomato|cream',
        validator: ['tomato', 'cream'],
      },
    }, {
      short: 't',
      long: 'tomato',
      description: 'Choose if you want tomato',
    }, {
      short: 'p',
      long: 'peppers',
      description: 'Select the kind of pepper you want',
      parameter: {
        name: 'color',
        variadic: true,
        validator: ['green', 'yellow', 'red'],
      },
    }, {
      short: 'c',
      long: 'cheese',
      description: 'Select the cheese you want',
      parameter: {
        name: 'cheese',
        variadic: true,
        validator: (value) => {
          const availableCheese = ['mozzarella', 'provolone', 'cheddar', 'Parmesan'];
          if (!availableCheese.includes(value)) {
            return new ParameterValidationError('-c, --cheese [cheese]', value, 'Unknown cheese');
          }
          return true;
        },
      },
    }, {
      long: 'veggie',
      description: "Choose it if you don't want meet",
    }, {
      short: 'm',
      long: 'meet',
      description: 'Select the meet you want',
      parameter: {
        name: 'meet',
        variadic: true,
        validator: (value, otherValues) => {
          if (otherValues.veggie) {
            return new ParameterValidationError('-m, --meet <meet>', value, 'You cannot select meet if you choose veggie');
          }
          return ['ham', 'ground-beef', 'chicken'].includes(value);
        },
      },
    }, {
      short: 'n',
      long: 'name',
      description: 'Choose a name for your pizza',
      parameter: {
        name: 'my-very-cool-name',
      },
    },
  ],
  description: 'Create your own pizza',
  longDescription: 'This command allows to create a Pizza.\nGive it a try!',
});

pizza.setAction((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

pizza.parse(process.argv);
