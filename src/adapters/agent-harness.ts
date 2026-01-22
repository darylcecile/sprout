import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { constants, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import type { Manifest } from '../manifest';
import type { AdapterContext, AdapterFailureReason, IAdapter } from '../utils/Adapter';

export class AgentHarnessAdapter implements IAdapter {

	match(path: string): boolean {
		const normalized = path.split(sep).join('/');
		return normalized.includes('/agents/');
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {
		const normalized = path.split(sep).join('/');
		const marker = '/agents/';
		const markerIndex = normalized.lastIndexOf(marker);
		if (markerIndex === -1) return;

		const relativePath = normalized.slice(markerIndex + marker.length);
		const destinationPath = join(process.env.HOME as string, relativePath);

		// backup the original file if it exists
		if (await Bun.file(destinationPath).exists()) {
			const backupPath = join(tmpdir(), `${Date.now()}-agent-${relativePath.replaceAll('/', '-')}`);
			copyFileSync(destinationPath, backupPath, constants.COPYFILE_FICLONE);
			ctx.set(destinationPath, backupPath);
		}

		// create the directory if it doesn't exist
		const dirPath = join(destinationPath, '..');
		mkdirSync(dirPath, { recursive: true });

		// copy to destination
		copyFileSync(path, destinationPath, constants.COPYFILE_FICLONE);

		console.log(`Copied agent harness file to ${destinationPath}`);
	}

	async restore(ctx: AdapterContext, reason: AdapterFailureReason) {
		for (const [destinationPath, backupPath] of ctx.entries()) {
			if (!backupPath) {
				rmSync(destinationPath, { force: true });
				continue;
			}

			await copyFile(backupPath as string, destinationPath, constants.COPYFILE_FICLONE);
		}
	}

	async onError(ctx: AdapterContext, error: Error) {
		console.error(`Error configuring agent harness adapter: ${error.message}`);
	}
}
