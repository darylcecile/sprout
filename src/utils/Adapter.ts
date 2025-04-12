import type { Manifest } from "../manifest";

type JSONSafe = string | number | boolean | null | JSONSafe[] | { [key: string]: JSONSafe };

export class AdapterContext extends Map<string, JSONSafe> {

	serialize(): string {
		return JSON.stringify(Object.fromEntries(this));
	}

	static deserialize(data: string): AdapterContext {
		const parsed = JSON.parse(data);
		const ctx = new AdapterContext();

		for (const [key, value] of Object.entries(parsed)) {
			ctx.set(key, value as JSONSafe);
		}

		return ctx;
	}

}

export class AdapterError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "AdapterError";
	}
}

export const AdapterFailureReason = {
	CONFIG_FAILURE: 'config-failure',
	UNKNOWN_FAILURE: 'unknown-failure',
} as const;
export type AdapterFailureReason = typeof AdapterFailureReason[keyof typeof AdapterFailureReason];

export interface IAdapter {
	match(path: string): boolean;
	configure(path: string, ctx: AdapterContext, manifest?: Manifest | null): Promise<void>;
	restore?: (ctx: AdapterContext, reason: AdapterFailureReason) => Promise<void>;
	cleanup?: (ctx: AdapterContext) => Promise<void>;

	onError?: (ctx: AdapterContext, error: Error) => Promise<void>;
}

export async function processAdapters(adapters: IAdapter[], path: string, manifest?: Manifest | null) {
	const contextMap = new WeakMap<IAdapter, AdapterContext>();
	const results = await Promise.all(
		adapters.map(async (adapter) => {
			if (!adapter.match(path)) return;

			const ctx = new AdapterContext();
			contextMap.set(adapter, ctx);

			try {
				await adapter.configure(path, ctx, manifest);
			}
			catch (e) {
				await adapter.onError?.(ctx, e as Error).catch(e => { });
				await adapter.restore?.(ctx, AdapterFailureReason.CONFIG_FAILURE).catch(e => {
					console.warn(`Adapter ${adapter.constructor.name} failed to restore: ${e.message}`);
				});
				return adapter
			}
			finally {
				await adapter.cleanup?.(ctx).catch(e => {
					console.warn(`Adapter ${adapter.constructor.name} failed to cleanup: ${e.message}`);
				});
			}
		})
	);

	const failed = results.filter(response => response !== undefined);

	if (failed.length > 0) {
		console.warn(`${failed.length} adapters failed to process.`);
		for (const a of failed) {
			const ctx = contextMap.get(a);

			if (!ctx) {
				console.warn(`Adapter ${a.constructor.name} failed to process: context not found`);
				continue;
			}

			a.restore?.(ctx, AdapterFailureReason.UNKNOWN_FAILURE).catch(e => {
				console.warn(`Adapter ${a.constructor.name} failed to restore: ${e.message}`);
			});
		}

		throw new AdapterError(`Failed to process ${failed.length} adapters`);
	}
}