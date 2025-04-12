import { logger } from './log';

// needed as this doesnt immediately show up in PATH when chain-installing
export function getBrewPath() {
	//macos
	if (process.platform === 'darwin') {
		// intel
		if (process.arch === 'x64') {
			return '/usr/local/bin/brew';
		}
		// apple silicon
		return '/opt/homebrew/bin/brew';
	}
	// linux
	if (process.platform === 'linux') {
		return '/home/linuxbrew/.linuxbrew/bin/brew';
	}
	// unknown platform
	logger.error('Unknown platform. Please install brew manually');
	process.exit(1);
}