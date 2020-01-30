#!/usr/bin/env ts-node
/* tslint:disable:no-console */
import "source-map-support/register";
import Command from "../src/command";

const pizza = new Command({
  name: `pizza`,
  options: [
    {
      short: "t",
      long: "tomato",
      description: "Choose if you want tomato",
    }, {
      short: "m",
      long: "mozzarella",
      description: "Choose if you want mozzarella",
    },
  ],
  description: "Create your own pizza",
  longDescription: "This command allows to create a Pizza.\nGive it a try!",
});

pizza.setAction((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

pizza.parse(process.argv);
