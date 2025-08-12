import httpClient from "./client";
import { AxiosError } from "axios";
import { z } from "zod";

export interface PullFilters {
  projects?: { id: string }[];
  variants?: { id: string }[];
  richText?: "html" | false;
}

const TextItemsResponse = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    richText: z.string().optional(),
    status: z.string(),
    notes: z.string(),
    tags: z.array(z.string()),
    variableIds: z.array(z.string()),
    projectId: z.string(),
    variantId: z.string().nullable(),
  })
);

export type TextItemsResponse = z.infer<typeof TextItemsResponse>;

export default async function fetchText(filters?: PullFilters) {
  try {
    const params = filters;

    // endpoint only takes "html" or undefined
    if (params?.richText === false) {
      delete params.richText
    }

    const response = await httpClient.get("/v2/textItems", {
      params
    });

    return TextItemsResponse.parse(response.data);
  } catch (e: unknown) {
    if (!(e instanceof AxiosError)) {
      throw new Error(
        "Sorry! We're having trouble reaching the Ditto API. Please try again later."
      );
    }

    // Handle invalid filters
    if (e.response?.status === 400) {
      throw new Error(
        "Invalid filters. Please check your filters and try again."
      );
    }

    throw e;
  }
}
