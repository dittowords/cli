# Ditto CLI

The Ditto CLI helps teams integrate [Ditto](https://dittowords.com) into their build processes. You can use it to pull copy from Ditto into your codebase right from the terminal.

## Getting Started

Install the Ditto CLI globally by doing the following:

```json
npm install -g ditto-cli
```

Then, run `ditto-cli` to finish setting up. You'll be prompted to:

1. Provide your API key (found at [https://beta.dittowords.com/account/user](https://beta.dittowords.com/account/user))
2. Choose a Ditto project in your workspace to sync copy from. Only projects with **developer mode** enabled are accessible via the API.

Once you successfully provide that information, you're ready to start fetching copy!

## Commands

The Ditto CLI supports two main commands: `pull` and `project`. To run a command, prefix it with `ditto-cli`:

```json
ditto-cli [command]

# Run `--help` for detailed information about CLI commands
ditto-cli [command] help
```

### `pull`

This command does the following:

1. Pulls the text from the project defined in `ditto/config.yml` as a structured JSON
2. Copies that information into the `ditto/text.json` file, overwriting its existing contents

To change the project defined in `ditto/config.yml`, see the `project` command.

### `project`

Use this command to change the Ditto project you want to sync copy from (ie. the project defined in `ditto/config.yml`). Running this will allow you to select a project from a list of projects in your workspace that have developer mode enabled.

## Feedback

Have feedback? We'd love to hear it! Message us at [support@dittowords.com](mailto:support@dittowords.com).
