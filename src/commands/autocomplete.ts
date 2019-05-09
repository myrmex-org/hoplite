import { Command } from "../command";
import { getArgv } from "../process-argv-wrapper";

const autoCompletionCommand = new Command({
  name: "completion",
  parameters: [
    {
      name: `current-prompt-content`,
      description: `The current content typed in the prompt.`,
      mandatory: true,
    },
    {
      name: `cursor-position`,
      description: `Index of the word where the cursor is positioned.`,
      mandatory: true,
    },
  ],
  action: async function (parseResult) {
    const promptContent = parseResult["current-prompt-content"].substring(0, parseResult["current-prompt-content"].lastIndexOf(" "))
    const argv = (await getArgv(promptContent)).slice(0, parseInt(parseResult["cursor-position"], 10) + 2);
    const autoCompletionValues = await this.parentCommand.parseForAutoCompletion(argv);
    console.log('TRUC', autoCompletionValues.join(' '))
    process.exit(0);
  }
})

export default autoCompletionCommand;
export { autoCompletionCommand };
