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

## Custom Repository
If you want to create your own repository, you can do so by creating a new [profile repository](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme) in GitHub. 

If you already have a **public** profile repository, simply create a `setup` folder in the root of the repo. Inside setup, you can create folders for each type of config you want to store. A `.toml` file in the root of each folder can be used to specify additional setup instructions.

See https://github.com/darylcecile/darylcecile/tree/main/setup for an example of a profile repository.