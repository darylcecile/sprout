import { IdeVSCodeAdapter } from "./adapters/ide-vscode";
import { OhMyPoshThemeAdapter } from './adapters/ohmyposh-theme';
import { ShellAdapter } from "./adapters/shell";
import { ConfigFolderAdapter } from "./adapters/config-folder";


export const adapters = [
	new ShellAdapter(),
	new IdeVSCodeAdapter(),
	new OhMyPoshThemeAdapter(),
	new ConfigFolderAdapter(),
]
