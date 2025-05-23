import { outro } from '@clack/prompts';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { version } from '../package.json';
import { configCommand } from './commands/config';

const argv = yargs(hideBin(process.argv))
	.scriptName('sprout')
	.version(version);

argv.fail(() => { })

argv.command({
	command: 'config [repo]',
	describe: 'Configure settings',
	builder: yargs => {
		return yargs
			.positional('repo', {
				describe: 'The name of the repository that holds the config',
				type: 'string',
				default: process.env.USER
			})
			.option('folder', {
				alias: 'f',
				describe: 'Directory of the specific config to use from remote',
				type: 'string',
				required: true
			})
	},
	handler: argv => configCommand(argv)
});

argv.parseAsync();

process.on('beforeExit', () => {
	outro('')
});