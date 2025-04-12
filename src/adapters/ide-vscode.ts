import { cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest } from "../manifest";
import type { AdapterContext, IAdapter } from "../utils/Adapter";

export class IdeVSCodeAdapter implements IAdapter {

	match(path: string): boolean {
		return path.endsWith('ide/vscode/settings.json');
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {
		const backupPath = join(tmpdir(), `${Date.now()}-vscode`);
		const originalPath = this.getSettingsPathByPlatform();

		// backup the original file
		cpSync(originalPath, backupPath);
		ctx.set('backupPath', backupPath);

		// copy it to its new location
		cpSync(path, originalPath, { force: true });
	}

	async restore(ctx: AdapterContext) {
		const backupPath = ctx.get('backupPath');
		if (!backupPath) {
			console.warn('No backup path found for vscode adapter');
			return;
		}

		const originalPath = this.getSettingsPathByPlatform();

		// restore the original file
		cpSync(backupPath as string, originalPath, { force: true });
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