import type { ArgumentsCamelCase } from "yargs";
import { adapters } from '../constants';
import type { Manifest } from "../manifest";
import { type Directory, cloneRepository } from '../remote/clone';
import { processAdapters } from "../utils/Adapter";
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

	const stream = logger.openStream('Loading dependencies...');

	for (const dependency of manifest.dependency) {
		if (dependency.check) {
			stream.log(`Checking dependency: ${dependency.name}`);
			const out = Bun.spawnSync(['bash', '-c', dependency.check], {
				cwd: repo.getDirectory(),
				env: process.env
			});

			if (out.exitCode === 0) {
				stream.log(`Dependency ${dependency.name} is already installed. Skipping.`);
				continue;
			}
		}

		stream.log(`Installing dependency: ${dependency.name}`);
		switch (dependency.installer) {
			case 'brew': {
				const proc = Bun.spawn(['brew', 'install', dependency.name], {
					cwd: repo.getDirectory(),
					env: process.env,
					stdout: 'pipe',
					stderr: 'pipe'
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
	}
}

async function runCleanupScripts(repo: Directory, manifest: Manifest) {
	if (!manifest["cleanup-script"]) return;

	const stream = logger.openStream('Running cleanup scripts...');

	for (const script of manifest["cleanup-script"]) {
		if (!script.command) continue;

		stream.log(`Running script: ${script.command}`);

		const proc = Bun.spawn(['bash', '-c', script.command], {
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

		const proc = Bun.spawn(['bash', '-c', script.command], {
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