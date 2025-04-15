import ZI18NextFramework from "./i18next";
import { z } from "zod";

export const ZJSONFramework = ZI18NextFramework.or(
  ZI18NextFramework.shape.type
);

export type JSONFramework = z.infer<typeof ZJSONFramework>;
