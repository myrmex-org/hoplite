import { exec } from 'child_process';
import { promisify } from 'util';

async function getArgv(input: string): Promise<string[]> {
  const command = `node -e "console.log(JSON.stringify(process.argv))" -- ${process.mainModule.filename} ${input}`;
  return promisify(exec)(command).then(({ stdout }) => JSON.parse(stdout));
}

export default getArgv;
export { getArgv };
