import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { constants, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest } from "../manifest";
import type { AdapterContext, IAdapter } from "../utils/Adapter";

export class OhMyPoshThemeAdapter implements IAdapter {

	destinationFilePath = `${process.env.HOME}/.config/zen.toml`

	match(path: string): boolean {
		return path.endsWith('/zen.toml');
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {

		// backup the original file
		if (await Bun.file(this.destinationFilePath).exists()) {
			const backupPath = join(tmpdir(), `${Date.now()}-ohmyposh-theme`);
			copyFileSync(this.destinationFilePath, backupPath, constants.COPYFILE_FICLONE);
			ctx.set('backupPath', backupPath);
		}

		// create the directory if it doesn't exist
		const dirPath = join(this.destinationFilePath, '..');
		mkdirSync(dirPath, { recursive: true });

		// copy it to its new location
		copyFileSync(path, this.destinationFilePath, constants.COPYFILE_FICLONE);

		console.log(`Copied file to ${this.destinationFilePath}`);
	}

	async restore(ctx: AdapterContext) {

		const backupPath = ctx.get('backupPath');
		if (!backupPath) {
			console.warn('No backup path found for ohmyposh-theme adapter. Deleting the file instead');
			rmSync(this.destinationFilePath, { force: true });
			return;
		}

		// restore the original file
		copyFile(backupPath as string, this.destinationFilePath, constants.COPYFILE_FICLONE);
	}

	async onError(ctx: AdapterContext, error: Error) {
		console.error(`Error configuring ohmyposh-theme adapter: ${error.message}`);
	}
}