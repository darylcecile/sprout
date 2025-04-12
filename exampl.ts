const baseWritable = new WritableStream({
	write(chunk) {
		const text = new TextDecoder().decode(chunk);
		console.log("📦", text.trim());
	},
	close() {
		console.log("✅ Writable closed");
	},
});

// Create a transform wrapper for each input stream
function prefixStream(prefix: string) {
	return new TransformStream({
		transform(chunk, controller) {
			const text = new TextDecoder().decode(chunk);
			controller.enqueue(new TextEncoder().encode(`[${prefix}] ${text}`));
		},
	});
}

const proc = Bun.spawn(["sh", "-c", "echo hello; echo error 1>&2"], {
	stdout: "pipe",
	stderr: "pipe",
});

// Pipe each to its own TransformStream before writing to shared destination
const stdoutTransform = prefixStream("stdout");
const stderrTransform = prefixStream("stderr");

await Promise.all([
	proc.stdout?.pipeThrough(stdoutTransform).pipeTo(baseWritable, { preventClose: true }),
	proc.stderr?.pipeThrough(stderrTransform).pipeTo(baseWritable, { preventClose: false }),
]);

await proc.exited;
