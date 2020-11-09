#!/usr/bin/env ts-node
/* tslint:disable:no-console */
import "source-map-support/register";
import Command from "../src/command";
import { ParameterValidationError } from "../src/validation";

const pizza = new Command({
  name: `pizza`,
  options: [
    {
      short: "b",
      long: "base",
      description: "Select the base of the pizza",
      mandatory: true,
      parameter: {
        name: "base",
        validator: ["tomato", "cream"],
      },
    }, {
      short: "t",
      long: "tomato",
      description: "Choose if you want tomato",
    }, {
      long: "peppers",
      description: "Select the kind of pepper you want",
      parameter: {
        name: "color",
        variadic: true,
        validator: ["green", "yellow", "red"],
      },
    }, {
      short: "c",
      long: "cheese",
      description: "Select the cheese you want",
      parameter: {
        name: "cheese",
        variadic: true,
        validator: (value) => {
          const availableCheese = ["mozzarella", "provolone", "cheddar", "Parmesan"]
          if (!availableCheese.includes(value)) {
            return new ParameterValidationError("-c, --cheese [cheese]", value, "Unknown cheese")
          }
        },
      },
    }, {
      long: "veggie",
      description: "Choose it if you don't want meet",
    }, {
      short: "m",
      long: "meet",
      description: "Select the meet you want",
      parameter: {
        name: "meet",
        variadic: true,
        validator: (value, otherValues) => {
          if (otherValues.veggie) {
            return new ParameterValidationError("-m, --meet <meet>", value, "You cannot select meet if you choose veggie");
          } else {
            return ["ham", "ground-beef", "chicken"].includes(value)
          }
        }
      }
    },
  ],
  description: "Create your own pizza",
  longDescription: "This command allows to create a Pizza.\nGive it a try!",
});

pizza.setAction((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

pizza.parse(process.argv);
