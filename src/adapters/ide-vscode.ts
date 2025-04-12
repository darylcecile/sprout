import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { constants, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest } from "../manifest";
import type { AdapterContext, IAdapter } from "../utils/Adapter";

export class IdeVSCodeAdapter implements IAdapter {

	match(path: string): boolean {
		return path.endsWith('ide/vscode/settings.json');
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {
		const originalPath = this.getSettingsPathByPlatform();

		// backup the original file
		if (await Bun.file(originalPath).exists()) {
			const backupPath = join(tmpdir(), `${Date.now()}-vscode`);
			copyFileSync(originalPath, backupPath, constants.COPYFILE_FICLONE);
			ctx.set('backupPath', backupPath);
		}

		// create the directory if it doesn't exist
		const dirPath = join(originalPath, '..');
		mkdirSync(dirPath, { recursive: true });

		// copy it to its new location
		copyFileSync(path, originalPath, constants.COPYFILE_FICLONE);

		console.log(`Copied file to ${originalPath}`);
	}

	async restore(ctx: AdapterContext) {
		const originalPath = this.getSettingsPathByPlatform();

		const backupPath = ctx.get('backupPath');
		if (!backupPath) {
			console.warn('No backup path found for vscode adapter. Deleting the file instead');
			rmSync(originalPath, { force: true });
			return;
		}

		// restore the original file
		copyFile(backupPath as string, originalPath, constants.COPYFILE_FICLONE);
	}

	async onError(ctx: AdapterContext, error: Error) {
		console.error(`Error configuring vscode adapter: ${error.message}`);
	}

	getSettingsPathByPlatform() {
		const platform = process.platform;
		if (platform === 'darwin') {
			return `${process.env.HOME}/Library/Application Support/Code/User/settings.json`;
		}
		if (platform === 'linux') {
			return `${process.env.HOME}/.config/Code/User/settings.json`;
		}
		if (platform === 'win32') {
			return `${process.env.APPDATA}/Code/User/settings.json`;
		}
		throw new Error(`Unsupported platform: ${platform}`);
	}

}