# Ditto CLI

The Ditto CLI enables developers to access the Ditto API directly from the command line.

[![NPM version](https://badge.fury.io/js/@dittowords%2Fcli.svg)](https://badge.fury.io/js/@dittowords%2Fcli)

## Documentation

The official documentation can be found [here](http://developer.dittowords.com/cli-reference/authentication).

## Support

- [Bug Reports](https://github.com/dittowords/cli/issues/)
- [Support Chat](https://www.dittowords.com)
- [What is Ditto?](https://www.dittowords.com/docs/what-is-ditto)

## Installation

```sh
npm install --save-dev @dittowords/cli@beta
```

It's recommended to install the CLI as a development dependency to ensure your whole team is on the same version.

## Authentication

The first time you run the CLI, you’ll be asked to provide an API key. You can generate an API key from your [developer integrations settings](https://app.dittowords.com/account/devtools).

See the [Authentication](http://developer.dittowords.com/api-reference/authentication) page for more information on API keys.

## Configuration

By default, the CLI operates against a `ditto/` folder relative to the current working directory.

The first time you run the CLI, a `ditto/` folder will be created if it doesn't already exist. The folder will also be populated with a default `config.yml` file, which is used to control the CLI's behavior.

The default file looks like this:

```yml
projects: [],
variants: [],
outputs:
  - format: json,
    framework: i18next
```

For more information on configuring the CLI, see [http://developer.dittowords.com/cli-reference/configuration](http://developer.dittowords.com/cli-reference/configuration).

## Usage

```bash
npx @dittowords/cli
```

Run the CLI to pull string data from Ditto and write it to disk.

String files are written to the `ditto` folder in a format that corresponds to your configuration. After integrating these files into development, you can execute the CLI at any time to fetch the latest strings from Ditto and update them in your application.

For more information on how files written to disk, see [http://developer.dittowords.com/cli-reference/files](http://developer.dittowords.com/cli-reference/files).

See our demo projects for examples of how to integrate the Ditto CLI in different environments:

- [React web app](https://github.com/dittowords/ditto-react-demo)
- [iOS mobile app](https://github.com/dittowords/ditto-react-demo)
- [Android mobile app](https://github.com/dittowords/ditto-react-demo)

## Feedback

Have feedback? We’d love to hear it! Message us at [support@dittowords.com](mailto:support@dittowords.com).
