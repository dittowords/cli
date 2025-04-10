import { z } from "zod";

const ZProjectConfigYAML = z.object({
  projects: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
  outputs: z.array(
    z.object({
      format: z.enum(["i18next"]),
    })
  ),
});

type ProjectConfigYAML = z.infer<typeof ZProjectConfigYAML>;

export const DEFAULT_PROJECT_CONFIG_JSON: ProjectConfigYAML = {
  projects: [],
  variants: [],
  outputs: [
    {
      format: "i18next",
    },
  ],
};

export async function initProjectConfig() {
  // TODO: Implement
}
