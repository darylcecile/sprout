import type { ArgumentsCamelCase } from "yargs";
import { adapters } from '../constants';
import type { Manifest } from "../manifest";
import { type Directory, cloneRepository } from '../remote/clone';
import { processAdapters } from "../utils/Adapter";
import { getBrewPath } from "../utils/locations";
import { logger } from '../utils/log';

type Argv = ArgumentsCamelCase<{
	repo: string | undefined;
	folder: string;
}>

export async function configCommand(argv: Argv) {
	logger.intro(`Setting up config using ${argv.repo} ${argv.folder ? `(${argv.folder})` : ''}`);

	if (argv.repo === undefined) {
		logger.error('Repository name is required');
		process.exit(1);
	}

	const repo = await cloneRepository(argv.repo);

	// default to the setup directory (root)
	repo.setDirectory('setup');

	// default to the root directory if no folder is specified
	if (argv.folder) {
		logger.step(`Using folder: ${argv.folder}`);
		repo.setDirectory(argv.folder);
	}

	const manifest = await repo.getManifest();

	const files = repo.listFiles({
		ignore: ['.gitignore', 'README.md']
	});

	if (manifest?.["setup-script"]) await runSetupScripts(repo, manifest);

	if (manifest?.dependency) {
		await loadDependencies(repo, manifest);
	}

	const stream = logger.openStream('Processing files...');

	for (const file of files) {
		if (!file.name) continue; // this can never happen, but just in case
		if (file.name.endsWith('/.toml')) continue; // skip sprout toml files
		stream.log(`Processing file: ${file.name}`);
		await new Promise(resolve => setTimeout(resolve, 1000)); // simulate some processing time
		await processAdapters(adapters, file.name, manifest)
	}

	stream.end('Processing completed', 'success');

	if (manifest?.["cleanup-script"]) await runCleanupScripts(repo, manifest);
}

async function loadDependencies(repo: Directory, manifest: Manifest) {
	if (!manifest.dependency) return;

	for (const dependency of manifest.dependency) {
		const stream = logger.openStream(`Installing ${dependency.name}...`);

		if (dependency.check) {
			stream.log(`Checking dependency: ${dependency.name}`);
			const out = Bun.spawnSync(['zsh', '-c', dependency.check], {
				cwd: repo.getDirectory(),
				env: {
					...process.env,
					SHELL: '/bin/zsh'
				}
			});

			if (out.exitCode === 0) {
				stream.end(`Dependency ${dependency.name} is already installed.`);
				continue;
			}
		}

		const needSudo = dependency.require_elevated_access ?? false;
		const needInteractive = needSudo || (dependency.require_interactive ?? false);

		switch (dependency.installer) {
			case 'brew': {
				const brewLocation = getBrewPath();
				const cmd = createCommand({
					command: [brewLocation, 'install', dependency.name],
					sudo: needSudo
				});

				const proc = Bun.spawn(cmd, {
					cwd: repo.getDirectory(),
					env: {
						...process.env,
						SHELL: '/bin/zsh'
					},
					stdout: 'pipe',
					stderr: 'pipe',
					stdin: needInteractive ? 'inherit' : 'ignore'
				});

				stream.sink(proc.stdout, proc.stderr);

				const code = await proc.exited;

				if (code !== 0) {
					stream.end(`Error installing dependency: ${dependency.name}`, 'failure');
					process.exit(code);
				}

				break;
			}
			case 'bash': {
				if (!dependency.command) {
					stream.end("No command provided for bash installer", 'failure');
					process.exit(1);
				}

				const cmd = createCommand({
					command: ['zsh', '-c', dependency.command],
					sudo: needSudo
				});

				const proc = Bun.spawn(cmd, {
					cwd: repo.getDirectory(),
					env: process.env,
					stdout: 'pipe',
					stderr: 'pipe',
					stdin: needInteractive ? 'inherit' : 'ignore'
				});

				stream.sink(proc.stdout, proc.stderr);

				const code = await proc.exited;
				if (code !== 0) {
					stream.end(`Error installing dependency: ${dependency.name}`, 'failure');
					process.exit(code);
				}
				break;
			}
		}

		stream.end(`${dependency.name} installed`, 'success');
	}

}

async function runCleanupScripts(repo: Directory, manifest: Manifest) {
	if (!manifest["cleanup-script"]) return;

	const stream = logger.openStream('Running cleanup scripts...');

	for (const script of manifest["cleanup-script"]) {
		if (!script.command) continue;

		stream.log(`Running script: ${script.command}`);

		const proc = Bun.spawn(['zsh', '-c', script.command], {
			cwd: repo.getDirectory(),
			env: process.env,
			stdout: 'pipe',
			stderr: 'pipe'
		});

		stream.sink(proc.stdout, proc.stderr);

		const code = await proc.exited;

		if (code !== 0) {
			stream.end(`Error running script: ${script.command}`, 'failure');
			process.exit(code);
		}
	}
	stream.end('Cleanup scripts completed', 'success');
}

async function runSetupScripts(repo: Directory, manifest: Manifest) {
	if (!manifest["setup-script"]) return;

	const stream = logger.openStream('Running setup scripts...');

	for (const script of manifest["setup-script"]) {
		if (!script.command) continue;

		stream.log(`Running script: ${script.command}`);

		const proc = Bun.spawn(['zsh', '-c', script.command], {
			cwd: repo.getDirectory(),
			env: process.env,
			stdout: 'pipe',
			stderr: 'pipe'
		});

		stream.sink(proc.stdout, proc.stderr);

		const code = await proc.exited;

		if (code !== 0) {
			stream.end(`Error running script: ${script.command}`, 'failure');
			process.exit(code);
		}
	}

	stream.end('Setup scripts completed', 'success');
}

type CommandOptions = {
	command: string[],
	sudo?: boolean
}
function createCommand(options: CommandOptions) {
	const { command, sudo } = options;

	if (sudo) {
		return ['sudo', ...command];
	}

	return command;
}

