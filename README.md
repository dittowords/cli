# Ditto CLI v5

The Ditto CLI enables developers to access the Ditto API directly from the command line. The v5 version of the CLI defaults to use the new Ditto Beta by default, but still fully supports legacy configurations and projects by passing in a `--legacy` flag to all invocations.

[![NPM version](https://badge.fury.io/js/@dittowords%2Fcli.svg)](https://badge.fury.io/js/@dittowords%2Fcli)

## Documentation

The official documentation can be found [here](https://dittov3.notion.site/Beta-Developer-Integrations-1d8cc8865c7a800eb13dc54d10c3d231).

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

For more information on configuring the CLI, see [this documentation section](https://dittov3.notion.site/Beta-Developer-Integrations-1d8cc8865c7a800eb13dc54d10c3d231#1d8cc8865c7a80e68ebbeb083404d8ed).

## Usage

```bash
npx @dittowords/cli
```

Run the CLI to pull string data from Ditto and write it to disk.

String files are written to the `ditto` folder in a format that corresponds to your configuration. After integrating these files into development, you can execute the CLI at any time to fetch the latest strings from Ditto and update them in your application.

For more information on how files written to disk, see [this documentation section](https://dittov3.notion.site/Beta-Developer-Integrations-1d8cc8865c7a800eb13dc54d10c3d231#1d8cc8865c7a80c7bd4fe6f5f254f4d4).

See our demo projects for examples of how to integrate the Ditto CLI in different environments:

- [React web app](https://github.com/dittowords/ditto-react-demo)
- [iOS mobile app](https://github.com/dittowords/ditto-react-demo)
- [Android mobile app](https://github.com/dittowords/ditto-react-demo)

# Legacy Setup

v5 of the Ditto CLI points at the new Ditto beta experience by default. To run the CLI compatible with legacy Ditto, append the `--legacy` flag, and the CLI will work as it did in the `4.x` version. All existing legecy commands are depricated, but fully functional at this time.

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
