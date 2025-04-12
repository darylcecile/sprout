# sprout

## Usage

To use the `sprout` CLI, follow these steps:

1. Install the CLI by running:
	```bash
	yarn install -g @shrubs/sprout
	```

2. Verify the installation:
	```bash
	sprout --version
	```

3. When you are ready to pull a config from a remote repository, run:
	```bash
	sprout config <repo-name-only> -f <folder>
	```
	Replace `<repo-name-only>` with the name of the repository you want to pull from, and `<folder>` with the folder where you want to store the configuration. For example, if you wanted to pull down the `ide/vscode` settings from the `darylcecile` repository, you would run:
	```bash
	sprout config darylcecile -f ide/vscode
	```

4. For additional commands and options, run:
	```bash
	sprout --help
	```