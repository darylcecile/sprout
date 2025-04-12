import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { constants } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import type { Manifest } from '../manifest';
import type { AdapterContext, AdapterFailureReason, IAdapter } from '../utils/Adapter';

export class ShellAdapter implements IAdapter {

	match(path: string): boolean {
		const fileNameWithoutExtension = basename(path, extname(path));
		return fileNameWithoutExtension === '.zshrc';
	}

	async configure(path: string, ctx: AdapterContext, manifest?: Manifest | null) {
		const file = Bun.file(path);

		// we need to replace the content of the file if it contains original_author_user
		if (manifest?.config?.original_author_user) {
			const originalUser = manifest?.config?.original_author_user;
			const content = await file.text();
			const newContent = content.replaceAll(originalUser, process.env.USER as string);
			if (newContent !== content) {
				await file.write(newContent);
			}
		}

		// backup the original file
		if (await Bun.file(`${process.env.HOME}/.zshrc`).exists()) {
			const backupPath = join(tmpdir(), `${Date.now()}-zshrc`);
			copyFileSync(`${process.env.HOME}/.zshrc`, backupPath, constants.COPYFILE_FICLONE);
			ctx.set('backupPath', backupPath);
		}

		// copy it to its new location
		copyFileSync(path, `${process.env.HOME}/.zshrc`, constants.COPYFILE_FICLONE);

		console.log('Copied file to ~/.zshrc');
	}

	async restore(ctx: AdapterContext, reason: AdapterFailureReason) {
		// we don't check reason here as we want to restore regardless of the reason
		const backupPath = ctx.get('backupPath');
		if (!backupPath) {
			console.warn('No backup path found for shell adapter. Deleting the file instead');
			rmSync(`${process.env.HOME}/.zshrc`, { force: true });
			return;
		}

		// restore the original file
		copyFileSync(backupPath as string, `${process.env.HOME}/.zshrc`, constants.COPYFILE_FICLONE);
	}

}