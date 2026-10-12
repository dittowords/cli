import BaseJSONFormatter from "./shared/baseJson";
import { ExportFormat } from "../http/types";

/**
 * Handles both `{ format: "json" }` and `{ format: "json", framework: "i18next" }`. The JSON
 * file contents are the same for both; i18next additionally writes an `index.js` driver file.
 */
export default class JSONFormatter extends BaseJSONFormatter {
  protected exportFormat: ExportFormat = "json_i18next";
}
