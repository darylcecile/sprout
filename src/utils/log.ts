
import { WritableStream } from "node:stream/web";
import * as clack from "@clack/prompts";
import chalk from "chalk";

export const logger = {
	...clack.log,
	intro: clack.intro,
	outro: clack.outro,
	detail: (message: string) => {
		process.stdout.write(`│  ${message}\n`);
	},
	spinner: clack.spinner,
	openStream: (message: string, options?: { maxOutputLines?: number }) => {
		const outputLines: string[] = [];
		const maxLines = options?.maxOutputLines ?? 10;
		const supportsReplace = process.stdout.isTTY && process.stdout.columns > 0;
		let lastRenderedLineCount = 0;

		const oldConsoleLog = console.log;
		const oldConsoleLogError = console.error;
		const oldConsoleLogWarn = console.warn;
		const oldConsoleLogInfo = console.info;

		clack.log.message(message, { symbol: chalk.yellow('○') });

		process.stdout.write('│ \n');

		function clearLastNLines(n: number) {
			for (let i = 0; i < n; i++) {
				process.stdout.clearLine(0);
				process.stdout.moveCursor(0, -1);
			}
		}

		function log(line: string) {
			if (!supportsReplace) {
				process.stdout.write(`│  ${chalk.gray(line)}\n`);
				return;
			}

			clearLastNLines(lastRenderedLineCount);

			outputLines.push(line);

			const lines = outputLines.slice(-maxLines);

			lines.forEach((line, index) => {
				process.stdout.write(`│  ${chalk.gray(line)}\n`);
			});
			lastRenderedLineCount = lines.length;
		}

		function end(endMessage?: string, style?: "success" | "failure" | "warning") {
			console.log = oldConsoleLog;
			console.error = oldConsoleLogError;
			console.warn = oldConsoleLogWarn;
			console.info = oldConsoleLogInfo;

			if (!supportsReplace) {
				process.stdout.write('│ \n');
				process.stdout.write(`│  ${chalk.gray(endMessage)}\n`);
				return;
			}

			clearLastNLines(lastRenderedLineCount + 3);

			const method = style === "warning" ? clack.log.warn : style === "failure" ? clack.log.error : clack.log.success;

			method(endMessage ?? message);

			process.stdout.write('│ \n');
			outputLines.forEach((line, index) => {
				process.stdout.write(`│  ${chalk.gray(line)}\n`);
			});
			process.stdout.write('│ \n');
		}

		console.log = (...args: unknown[]) => {
			log(args.join(' '));
		};
		console.error = (...args: unknown[]) => {
			log(chalk.red(args.join(' ')));
		};
		console.warn = (...args: unknown[]) => {
			log(chalk.yellow(args.join(' ')));
		};

		function consumeChunk(chunk: string | Uint8Array) {
			const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
			const lines = text.split('\n');
			for (const line of lines) {
				log(line);
			}
		}

		return {
			log,
			end,
			// writeable: new WritableStream({
			// 	write: (chunk) => {
			// 		const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
			// 		const lines = text.split('\n');
			// 		for (const line of lines) {
			// 			log(line);
			// 		}
			// 	}
			// }),
			sink: async (out?: ReadableStream<Uint8Array<ArrayBufferLike>>, err?: ReadableStream<Uint8Array<ArrayBufferLike>>) => {
				await Promise.all([
					(async () => {
						if (!out) return;
						const reader = out.getReader();
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							consumeChunk(value);
						}
						reader.releaseLock();
					})(),
					(async () => {
						if (!err) return;
						const reader = err.getReader();
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							consumeChunk(value);
						}
						reader.releaseLock();
					})()
				])
			}
		}
	}
};