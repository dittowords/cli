import { z } from "zod";

const ZI18NextFramework = z.object({
  type: z.literal("i18next"),
});

export const ZI18NextFrameworkDefaultValues: z.infer<typeof ZI18NextFramework> =
  {
    type: "i18next",
  };

export default ZI18NextFramework;
