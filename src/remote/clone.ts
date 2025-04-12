import { mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intro, log, note, spinner } from '@clack/prompts';
import AdmZip from 'adm-zip';
import { type Manifest, loadManifest } from '../manifest/index';
import { logger } from '../utils/log';

export class GitError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "GitError";
	}
}

export class Directory {
	private cwd: string;
	public readonly initialPath: string;

	constructor(path: string) {
		this.cwd = path;
		this.initialPath = path;
	}

	setDirectory(path: string) {
		this.cwd = join(this.cwd, path);
	}

	getDirectory() {
		return this.cwd;
	}

	listFiles(options?: { ignore?: string[] }) {
		const { ignore = [] } = options || {};
		const items = readdirSync(this.cwd, { withFileTypes: true });
		return items.filter(item => {
			// Filter out directories and only keep files
			return item.isDirectory() === false && !ignore.includes(item.name);
		}).map(item => {
			return Bun.file(join(this.cwd, item.name));
		});
	}

	listDirectories() {
		const items = readdirSync(this.cwd, { withFileTypes: true });
		return items.filter(item => {
			// Filter out files and only keep directories
			return item.isDirectory() === true;
		}).map(item => {
			return Bun.file(join(this.cwd, item.name));
		});
	}

	async getManifest(): Promise<Manifest | null> {
		const manifestPath = join(this.cwd, '.toml');
		const manifestFile = Bun.file(manifestPath);
		if (await manifestFile.exists()) {
			return loadManifest(manifestPath);
		}
		return null;
	}
}

export async function cloneRepository(org: string, repo: string = org) {
	if (process.env.SPROUT_REPO) {
		return new Directory(process.env.SPROUT_REPO);
	}

	// const progress = spinner();
	const stream = logger.openStream('Fetching from remote');

	const branch = await getDefaultBranch(org, repo);
	const url = new URL(`https://github.com/${org}/${repo}/archive/refs/heads/${branch}.zip`);

	stream.log(`Fetching from ${url}...`);

	const response = await fetch(url);

	if (!response.ok) {
		stream.end('Failed to fetch repository', 'failure');
		throw new GitError(`Failed to fetch repository ${org}/${repo}: ${response.statusText}`);
	}

	stream.log('Download complete, extracting...');

	const zipBuffer = await response.arrayBuffer();
	const zip = new AdmZip(Buffer.from(zipBuffer));
	const tmpDir = join(tmpdir(), `${Date.now()}-${org}`);

	mkdirSync(tmpDir, { recursive: true });

	zip.extractAllTo(tmpDir, true, true);

	stream.log(`Extracted ${zipBuffer.byteLength}bytes to ${tmpDir} successfully`);

	const dirPath = join(tmpDir, `${repo}-${branch}`);

	// Set the environment variable for the repository so that subprocesses can access it
	process.env.SPROUT_REPO = dirPath;

	stream.end('Fetched from remote! 🎉');

	return new Directory(dirPath);
}

export async function getDefaultBranch(org: string, repo: string = org) {
	const url = new URL(`https://api.github.com/repos/${org}/${repo}/branches`);

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'sprout-on-bun', // GitHub API requires a user agent
		}
	});

	if (!response.ok) {
		throw new GitError(`Failed to fetch branches for ${org}/${repo}: ${response.statusText}`);
	}

	const branches = await response.json();
	return branches[0].name;
}

