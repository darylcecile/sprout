import { type } from "arktype";

const ManifestSchema = type({
	config: {
		manifest_version: "string.semver",
		original_author_user: "string?",
		"overrides?": type({
			file: "string",
			to: "string"
		}).array()
	},
	"dependency?": type({
		name: "string",
		description: "string?",
		installer: type.enumerated("brew", "bash"), // just brew and bash for now
		check: "string?",
		command: "string?",
		require_elevated_access: "boolean?",
		require_interactive: "boolean?",
	}).array(),
	"setup-script?": type({
		name: "string",
		command: "string"
	}).array(),
	"cleanup-script?": type({
		name: "string",
		command: "string"
	}).array(),
});

export type Manifest = typeof ManifestSchema.infer;

class ManifestError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ManifestError";
	}
}

export async function loadManifest(manifestPath: string): Promise<Manifest> {
	const manifestFile = Bun.file(manifestPath);
	if (await manifestFile.exists() === false) throw new ManifestError(`Manifest file not found: ${manifestPath}`);

	try {
		const manifest = Bun.TOML.parse(await manifestFile.text());

		if ("config" in manifest === false) {
			throw new ManifestError(`Missing config in manifest: ${manifestPath}`);
		}

		if (typeof manifest.config !== "object" || !manifest.config || "manifest_version" in manifest.config === false) {
			throw new ManifestError(`Missing manifest version in manifest: ${manifestPath}`);
		}

		const typedManifest = ManifestSchema(manifest);

		if (typedManifest instanceof type.errors) {
			throw new ManifestError(`Invalid manifest: ${typedManifest.summary}`);
		}
		return typedManifest;
	}
	catch (e) {
		throw new ManifestError(`Failed to parse manifest: ${manifestPath}`, {
			cause: e
		});
	}
}