# Design: Rich text for CLI

## Architecture Changes
- Extend the text items API response schema to include an optional `richText` field
- Add a new configuration option `richText` to control rich text output behavior
- Modify the JSON formatter to conditionally use rich text values instead of plain text
- No changes to the overall architecture pattern - rich text is an additional data field

## Components Modified

### Core Components
- `lib/src/http/textItems.ts` - Update response schema to include richText field
- `lib/src/outputs/shared.ts` - Add richText configuration option
- `lib/src/outputs/json.ts` - Update output schema to support richText option
- `lib/src/formatters/json.ts` - Modify text value selection logic
- `lib/src/services/projectConfig.ts` - Update default config to include richText option

### Framework Processors
- `lib/src/formatters/frameworks/json/i18next.ts` - Update to handle rich text values
- `lib/src/formatters/frameworks/json/vue-i18n.ts` - Update to handle rich text values

### Legacy Support
- Legacy mode already has richText support implemented (found in `lib/legacy/types.ts` and `lib/legacy/pull.ts`)
- No changes needed for legacy mode

## Database Changes
- None - this is a client-side change consuming existing API capabilities

## API Changes
- No new endpoints required
- Existing `/v2/textItems` endpoint will be called with additional query parameter `richText=html` when rich text is enabled
- API response will include `richText` field alongside existing `text` field

## UI Changes
- None - this is a CLI tool with JSON output
- Rich text data will be output as raw JSON values, not rendered

## Implementation Notes

### Configuration Approach
- Add `richText` as an optional string flag in the output configuration
- Valid values: `"html"` to enable rich text, or undefined/null to use plain text
- Default value should be undefined to maintain backward compatibility
- Can be set globally or per-output configuration

### API Integration
- When `richText` is set to "html", pass query parameter to API: `richText=html`
- API response will include both `text` and `richText` fields
- Formatter will choose which field to use based on configuration

### Output Format
- When rich text is enabled, the JSON value will be the `richText` content
- Rich text format is an HTML string
- Variables file remains unchanged as it doesn't contain rich text

### Error Handling
- If rich text is requested but not available for a text item, fall back to plain text
- Log warnings for items missing rich text when it's expected
- Maintain robust parsing with Zod schema validation

### Testing Considerations
- Test with both rich text enabled and disabled
- Verify backward compatibility
- Test framework processors with rich text content
- Ensure proper fallback behavior when rich text is unavailable