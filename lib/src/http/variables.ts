import httpClient from "./client";
import { AxiosError } from "axios";
import { z } from "zod";

const ZBaseVariable = z.object({
  id: z.string(),
  name: z.string(),
});

const ZVariableNumber = ZBaseVariable.merge(
  z.object({
    type: z.literal("number"),
    data: z.object({
      example: z.union([z.number(), z.string()]),
      fallback: z.union([z.number(), z.string()]).optional(),
    }),
  })
);

const ZVariableString = ZBaseVariable.merge(
  z.object({
    type: z.literal("string"),
    data: z.object({
      example: z.string(),
      fallback: z.string().optional(),
    }),
  })
);

const ZVariableHyperlink = ZBaseVariable.merge(
  z.object({
    type: z.literal("hyperlink"),
    data: z.object({
      text: z.string(),
      url: z.string(),
    }),
  })
);

const ZVariableList = ZBaseVariable.merge(
  z.object({
    type: z.literal("list"),
    data: z.array(z.string()),
  })
);

const ZVariableMap = ZBaseVariable.merge(
  z.object({
    type: z.literal("map"),
    data: z.record(z.string()),
  })
);

const ZVariable = z.discriminatedUnion("type", [
  ZVariableString,
  ZVariableNumber,
  ZVariableHyperlink,
  ZVariableList,
  ZVariableMap,
]);

const ZVariablesResponse = z.array(ZVariable);

export type VariablesResponse = z.infer<typeof ZVariablesResponse>;

export default async function fetchVariables() {
  try {
    const response = await httpClient.get("/v2/variables");

    return ZVariablesResponse.parse(response.data);
  } catch (e: unknown) {
    console.log(JSON.stringify(e, null, 2));
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }
    throw e;
  }
}
