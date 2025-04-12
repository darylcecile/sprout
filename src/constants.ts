import { IdeVSCodeAdapter } from "./adapters/ide-vscode";
import { ShellAdapter } from "./adapters/shell";


export const adapters = [
	new ShellAdapter(),
	new IdeVSCodeAdapter()
]