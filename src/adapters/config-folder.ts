import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { constants } from 'node:fs/promises';
import { join } from 'node:path';
import type { Manifest } from "../manifest";
import type { AdapterContext, IAdapter } from "../utils/Adapter";

export class ConfigFolderAdapter implements IAdapter {

	match(path: string): boolean {
		return path.endsWith('/config') || path.endsWith('\\config');
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {
		const destinationRoot = `${process.env.HOME}/.config`;
		this.copyDirectory(path, destinationRoot);
		console.log(`Mirrored config folder to ${destinationRoot}`);
	}

	private copyDirectory(source: string, destination: string) {
		mkdirSync(destination, { recursive: true });

		for (const entry of readdirSync(source, { withFileTypes: true })) {
			// skip any toml files (manifest handled elsewhere)
			if (entry.name.endsWith('.toml')) continue;

			const srcPath = join(source, entry.name);
			const destPath = join(destination, entry.name);

			if (entry.isDirectory()) {
				this.copyDirectory(srcPath, destPath);
				continue;
			}

			// ensure destination directory exists
			mkdirSync(join(destPath, '..'), { recursive: true });
			copyFileSync(srcPath, destPath, constants.COPYFILE_FICLONE);
		}
	}
}
