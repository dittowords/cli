# Implementation: Rich text for CLI

## Task Breakdown

### 1. Update Text Items Response Schema
**Description**: Add richText field to the API response schema
- Files: `lib/src/http/textItems.ts`
- Dependencies: None
- Details:
  - Add `richText: z.string().optional()` to TextItemsResponse schema
  - Ensure backward compatibility with responses that don't include richText

### 2. Add Rich Text Configuration to Base Output
**Description**: Add richText option to the base output configuration
- Files: `lib/src/outputs/shared.ts`
- Dependencies: None
- Details:
  - Add `richText: z.literal("html").optional()` to ZBaseOutputFilters
  - This allows all output formats to inherit the richText option

### 3. Update Text Items API Request
**Description**: Pass richText parameter to API when configured
- Files: `lib/src/http/textItems.ts`
- Dependencies: Task 1, Task 2
- Details:
  - Modify fetchText function to accept richText parameter
  - Add richText to query params when set: `params.richText = "html"`
  - Update PullFilters interface to include richText option

### 4. Update JSON Formatter Pull Filters
**Description**: Pass richText configuration to API fetch
- Files: `lib/src/formatters/json.ts`
- Dependencies: Task 3
- Details:
  - Update generatePullFilter() to include richText from output config
  - Pass richText value to fetchText function

### 5. Modify JSON Formatter Output Logic
**Description**: Use richText field when available and configured
- Files: `lib/src/formatters/json.ts`
- Dependencies: Task 1, Task 4
- Details:
  - In transformAPIData(), check if richText is configured
  - Use `textItem.richText || textItem.text` when richText is enabled
  - Use `textItem.text` when richText is not configured

### 6. Update i18next Framework Processor
**Description**: Handle rich text in i18next output format
- Files: `lib/src/formatters/frameworks/json/i18next.ts`
- Dependencies: Task 5
- Details:
  - Ensure framework processor correctly handles HTML strings
  - No special escaping needed as HTML should be preserved

### 7. Update vue-i18n Framework Processor
**Description**: Handle rich text in vue-i18n output format
- Files: `lib/src/formatters/frameworks/json/vue-i18n.ts`
- Dependencies: Task 5
- Details:
  - Ensure framework processor correctly handles HTML strings
  - No special escaping needed as HTML should be preserved

### 8. Add Tests for Rich Text Feature
**Description**: Create tests to verify rich text functionality
- Files: New test files or updates to existing tests
- Dependencies: Tasks 1-7
- Details:
  - Test with richText="html" configuration
  - Test without richText configuration (backward compatibility)
  - Test fallback when richText field is missing
  - Test framework processors with HTML content

### 9. Update Documentation
**Description**: Document the new richText configuration option
- Files: `README.md`, configuration examples
- Dependencies: Tasks 1-7
- Details:
  - Add richText option to configuration documentation
  - Provide example config with richText enabled
  - Explain HTML output format

## Implementation Order

1. Update Text Items Response Schema (Task 1)
2. Add Rich Text Configuration to Base Output (Task 2)
3. Update Text Items API Request (Task 3)
4. Update JSON Formatter Pull Filters (Task 4)
5. Modify JSON Formatter Output Logic (Task 5)
6. Update i18next Framework Processor (Task 6)
7. Update vue-i18n Framework Processor (Task 7)
8. Add Tests for Rich Text Feature (Task 8)
9. Update Documentation (Task 9)

## Example Configuration

After implementation, users will be able to configure rich text like this:

```yaml
projects:
  - id: "project-id"
outputs:
  - format: json
    framework: i18next
    richText: html  # Enable rich text output
```

## Testing Checklist

- [ ] Rich text parameter is correctly passed to API
- [ ] HTML content is properly returned in JSON output
- [ ] Plain text fallback works when richText field is missing
- [ ] Configuration validation accepts "html" value
- [ ] Framework processors handle HTML strings correctly
- [ ] Backward compatibility maintained when richText is not configured
- [ ] Legacy mode continues to work with its existing richText implementation