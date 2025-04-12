import { Writable } from "node:stream";

const baseWritable = new WritableStream({
	write(chunk) {
		const text = new TextDecoder().decode(chunk);
		console.log("📦", text.trim());
	},
	close() {
		console.log("✅ Writable closed");
	},
});

const proc = Bun.spawn(["sh", "-c", "echo hello; echo error 1>&2"], {
	stdout: "pipe",
	stderr: "pipe"
});

await Promise.all([
	(async () => {
		for await (const chunk of proc.stdout) {
			const text = new TextDecoder().decode(chunk);
			console.log("📦", text.trim());
		}
	})(),
	(async () => {
		const reader = proc.stderr.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = new TextDecoder().decode(value);
			console.log("📦", text.trim());
		}
		reader.releaseLock();
		console.log("✅ Reader released");
	})()
]);

await proc.exited;

console.log("✅ Process exited");