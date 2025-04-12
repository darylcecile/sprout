import type { ArgumentsCamelCase } from "yargs";
import { adapters } from '../constants';
import type { Manifest } from "../manifest";
import { type Directory, cloneRepository } from '../remote/clone';
import { processAdapters } from "../utils/Adapter";

type Argv = ArgumentsCamelCase<{
	repo: string | undefined;
	folder: string;
}>

export async function configCommand(argv: Argv) {
	if (argv.repo === undefined) {
		console.error('Repository name is required');
		process.exit(1);
	}

	const repo = await cloneRepository(argv.repo);

	// default to the root directory if no folder is specified
	if (argv.folder) {
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

	for (const file of files) {
		if (!file.name) continue; // this can never happen, but just in case
		if (file.name.endsWith('/.toml')) continue; // skip sprout toml files
		await processAdapters(adapters, file.name, manifest)
	}

	if (manifest?.["cleanup-script"]) await runCleanupScripts(repo, manifest);
}

async function loadDependencies(repo: Directory, manifest: Manifest) {
	if (!manifest.dependency) return;
	for (const dependency of manifest.dependency) {
		if (dependency.check) {
			const out = Bun.spawnSync(['bash', '-c', dependency.check], {
				cwd: repo.getDirectory(),
				env: process.env
			});

			if (out.exitCode === 0) continue;
		}

		switch (dependency.installer) {
			case 'brew':
				Bun.spawnSync(['brew', 'install', dependency.name], {
					cwd: repo.getDirectory(),
					env: process.env
				});
				break;
		}
	}
}

async function runCleanupScripts(repo: Directory, manifest: Manifest) {
	if (!manifest["cleanup-script"]) return;

	for (const script of manifest["cleanup-script"]) {
		if (!script.command) continue;
		Bun.spawnSync(['bash', '-c', script.command], {
			cwd: repo.getDirectory(),
			env: process.env
		});
	}
}

async function runSetupScripts(repo: Directory, manifest: Manifest) {
	if (!manifest["setup-script"]) return;

	for (const script of manifest["setup-script"]) {
		if (!script.command) continue;
		Bun.spawnSync(['bash', '-c', script.command], {
			cwd: repo.getDirectory(),
			env: process.env
		});
	}
}