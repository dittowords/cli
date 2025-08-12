# Requirements: Rich text for CLI

## Overview
The Ditto public API now supports rich text format, returning a `richText` field in addition to plain text values. The CLI needs to be extended to support outputting this rich text format when retrieving text items, providing users with access to formatted content including markup, links, and other rich text elements through the command-line interface.

## User Stories
- As a developer using the Ditto CLI, I want to retrieve text items with rich text formatting so that I can access and work with formatted content in my development workflow
- As a team automating Ditto workflows, I want the CLI to optionally output rich text data so that we can preserve formatting information in our pipelines
- As a CLI user, I want to control whether I receive plain text or rich text output so that I can choose the appropriate format for my use case

## Acceptance Criteria
- [ ] CLI can retrieve and output the `richText` field from the API's get text items endpoint
- [ ] JSON output includes the `richText` value as the value in key-value pairs when rich text mode is enabled
- [ ] Configuration file includes a sensible option to enable/disable rich text output
- [ ] Rich text mode can be toggled via CLI flag or configuration setting
- [ ] Existing plain text functionality remains unchanged when rich text is disabled
- [ ] Documentation is updated to explain the rich text feature and how to enable it
- [ ] Rich text output is properly formatted in JSON responses

## Technical Requirements
- Integration with the existing API's `richText` field as documented in the Beta Developer Integrations guide
- Backward compatibility with existing CLI usage patterns
- Configuration management for rich text preference
- Proper JSON serialization of rich text content
- Support for all text item retrieval commands that currently exist in the CLI

## Out of Scope
- Rich text rendering/display in the terminal (only raw rich text data output)
- Rich text editing capabilities through the CLI
- Conversion between rich text and plain text formats
- Support for rich text in other API endpoints beyond text items retrieval