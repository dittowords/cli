import BaseJSONFormatter from "./shared/baseJson";
import { ExportFormat } from "../http/types";

/**
 * `{ format: "json", framework: "vue-i18n" }`. The API's `json_vue_i18n` format renders the
 * vue-specific syntax (single-brace interpolation, pipe-separated plural forms).
 */
export default class JSONVueI18nFormatter extends BaseJSONFormatter {
  protected exportFormat: ExportFormat = "json_vue_i18n";
}
