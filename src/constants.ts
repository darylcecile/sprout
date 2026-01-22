import { IdeVSCodeAdapter } from "./adapters/ide-vscode";
import { OhMyPoshThemeAdapter } from './adapters/ohmyposh-theme';
import { ShellAdapter } from "./adapters/shell";
import { AgentHarnessAdapter } from "./adapters/agent-harness";


export const adapters = [
	new ShellAdapter(),
	new IdeVSCodeAdapter(),
	new OhMyPoshThemeAdapter(),
	new AgentHarnessAdapter()
]
