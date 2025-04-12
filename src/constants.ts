import { IdeVSCodeAdapter } from "./adapters/ide-vscode";
import { OhMyPoshThemeAdapter } from './adapters/ohmyposh-theme';
import { ShellAdapter } from "./adapters/shell";


export const adapters = [
	new ShellAdapter(),
	new IdeVSCodeAdapter(),
	new OhMyPoshThemeAdapter()
]