import {
  Content,
  ContentListUnion,
  ContentUnion,
  FinishReason,
  FunctionDeclaration,
  GenerateContentConfig,
  GenerateContentResponse,
  GenerateContentResponseUsageMetadata,
  GoogleGenAI,
} from "@google/genai";
import logger from "../utils/logger";
import { z } from "zod";
import { ZodStandardJSONSchemaPayload } from "zod/v4/core";
import DittoError, { ErrorType } from "../utils/DittoError";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

interface GeminiCallMetadata {
  requestTimeMs: number;
  apiResponse?: GenerateContentResponse;
  geminiUsageMetadata?: GenerateContentResponseUsageMetadata;
  error?: string;
}
export interface GeminiCallResult<T extends z.ZodType> {
  data: z.infer<T>;
  metadata: GeminiCallMetadata;
}
export type IGeminiCallResult<T> = {
  data: T;
  metadata: GeminiCallMetadata;
};

/**
 * Calls the Gemini API with the given prompt and response schema.
 * @param prompt The prompt to send to the Gemini API.
 * @param responseSchema The schema to parse the response from the Gemini API. We'll submit this schema to Gemini,
 * so that it should return a JSON object that matches the shape, then use Zod to make certain it's valid.
 * @returns The response from the Gemini API.
 */
export async function callGemini<T extends z.ZodType>(
  contents: ContentListUnion,
  ZResponseSchema: T,
  systemInstruction: ContentUnion,
  config?: GenerateContentConfig,
  model?: string
): Promise<GeminiCallResult<T> | null> {
  const geminiCallMetadata = await callGeminiDirect(
    contents,
    systemInstruction,
    config ?? {},
    ZResponseSchema,
    model
  );
  if (geminiCallMetadata === null) {
    return null;
  }
  try {
    const generateContentResponse = geminiCallMetadata.data;
    if (geminiCallMetadata.metadata.error || !generateContentResponse?.text) {
      throw new Error(
        `No response text from Gemini API error: ${
          geminiCallMetadata.metadata.error ?? "unknown"
        }`
      );
    }

    // Parse the structured response
    const responseData = JSON.parse(generateContentResponse.text);
    const zParsedResponseData = ZResponseSchema.parse(responseData);
    return {
      data: zParsedResponseData,
      metadata: geminiCallMetadata.metadata,
    };
  } catch (e: any) {
    logger.errorText(`Error calling Gemini API: ${e.message}`);
  }
  return null;
}

/**
 * Calls the Gemini API with the given prompt and response schema.
 * @param prompt The prompt to send to the Gemini API.
 * @param responseSchema The schema to parse the response from the Gemini API. We'll submit this schema to Gemini,
 * so that it should return a JSON object that matches the shape, then use Zod to make certain it's valid.
 * @returns The response from the Gemini API.
 */
export async function callGeminiDirect<T extends z.ZodType>(
  contents: ContentListUnion,
  systemInstruction: ContentUnion,
  config: GenerateContentConfig,
  ZResponseSchema?: T,
  model: string = DEFAULT_GEMINI_MODEL
) {
  return callGeminiDirectWithJsonSchema(
    contents,
    systemInstruction,
    config,
    ZResponseSchema?.toJSONSchema(),
    model
  );
}

/**
 * Calls the Gemini API with the given prompt and response JsonSchema.
 * @param prompt The prompt to send to the Gemini API.
 * @param responseJsonSchema The Json schema to parse the response from the Gemini API. We'll submit this schema to Gemini,
 * so that it should return a JSON object that matches the shape, then use Zod to make certain it's valid.
 * @returns The response from the Gemini API.
 */
export async function callGeminiDirectWithJsonSchema<T>(
  contents: ContentListUnion,
  systemInstruction: ContentUnion,
  config: GenerateContentConfig,
  responseJsonSchema?: ZodStandardJSONSchemaPayload<T>,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<IGeminiCallResult<GenerateContentResponse> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Server configuration error. Gemini API key not found.");
  }
  const maxRetries = 3;
  const initialDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  let error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const startTime = Date.now();
      const generateContentResponse = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
          ...config,
          systemInstruction: systemInstruction,
          ...(responseJsonSchema !== undefined
            ? { responseJsonSchema, responseMimeType: "application/json" }
            : {}),
          thinkingConfig: {
            thinkingBudget: 0,
            ...config.thinkingConfig,
          },
        },
      });
      const endTime = Date.now();
      const errorCandidate = generateContentResponse.candidates?.find(
        (resp) => resp.finishReason !== FinishReason.STOP
      );
      if (errorCandidate) {
        return {
          data: generateContentResponse,
          metadata: {
            error: `Finish reason is not expected: ${errorCandidate.finishReason}`,
            requestTimeMs: Math.round(endTime - startTime),
            geminiUsageMetadata: generateContentResponse.usageMetadata,
          },
        };
      }
      return {
        data: generateContentResponse,
        metadata: {
          requestTimeMs: Math.round(endTime - startTime),
          geminiUsageMetadata: generateContentResponse.usageMetadata,
        },
      };
    } catch (e: any) {
      // Don't retry or log as error if the request was intentionally aborted
      if (e.name === "AbortError" || config.abortSignal?.aborted) {
        throw e;
      }
      const isRetryable = e.status === 503 || e instanceof SyntaxError;
      if (isRetryable && attempt < maxRetries - 1) {
        // Exponential backoff: Starting at 1 second, doubling each time, capped at 10 seconds
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        const reason =
          e instanceof SyntaxError
            ? "malformed JSON response"
            : "503 (Service Unavailable)";
        logger.warnText(
          `Gemini API error: ${reason}, retrying attempt ${
            attempt + 1
          } in ${delay}ms...`
        );
        error = { statusCode: 500, message: e.message };
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      logger.errorText(`Error calling Gemini API: ${e.message}`);
      if (error) {
        throw new DittoError({
          type: ErrorType.GeminiError,
          data: { rawErrorMessage: error.message },
          message: "Error calling Gemini API",
        });
      }
    }
  }
  return null;
}

export async function getEmbedding(
  text: string
): Promise<number[] | undefined> {
  const embeddings = await getEmbeddings([text]);
  return embeddings ? embeddings[0] : embeddings;
}

export async function getEmbeddings(
  texts: string[]
): Promise<number[][] | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Server configuration error. Gemini API key not found.");
  }
  const ai = new GoogleGenAI({ apiKey });
  let retryCount = 0;
  while (retryCount < 3) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: texts,
        config: { taskType: "SEMANTIC_SIMILARITY" },
      });

      return response.embeddings?.map((embed) => embed.values ?? []);
    } catch (error) {
      retryCount++;
      console.log(error);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  logger.errorText(
    `Gemini embedding request failed after all retries; textCount: ${texts.length}`
  );
  throw new DittoError({
    type: ErrorType.GeminiError,
    data: { rawErrorMessage: "Error while creating embeddings" },
    message: "Error while creating embeddings",
  });
}

type ToolCallResult<T> =
  | { done: true; result: T }
  | {
      done: false;
      response: {
        functionResponse: { name: string; response: Record<string, unknown> };
      };
    };

export type ToolHandler<T> = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<ToolCallResult<T>>;

/**
 * Runs an agentic Gemini tool-calling loop. Repeatedly calls Gemini and dispatches
 * function calls via {@link handleToolCall} until a terminal tool returns a result
 * or the iteration limit is reached.
 */
export async function runGeminiToolLoop<T>(args: {
  systemInstruction: string;
  tools: FunctionDeclaration[];
  initialContents: Content[];
  handleToolCall: ToolHandler<T>;
  label: string;
  maxIterations?: number;
  defaultResult: T;
}): Promise<T> {
  const {
    systemInstruction,
    tools,
    initialContents,
    handleToolCall,
    label,
    defaultResult,
  } = args;
  const maxIterations = args.maxIterations ?? 10;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: Content[] = [...initialContents];
  const maxRetries = 3;
  const initialDelay = 1000;
  const maxDelay = 10000;

  for (let i = 0; i < maxIterations; i++) {
    let response: GenerateContentResponse | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
          },
        });
        break;
      } catch (e: any) {
        const isRetryable =
          [429, 503].includes(e.status) ||
          e instanceof SyntaxError ||
          e.code === "ECONNRESET";
        if (isRetryable && attempt < maxRetries - 1) {
          const delay =
            Math.min(initialDelay * Math.pow(2, attempt), maxDelay) +
            Math.floor(Math.random() * 200);
          const reason =
            e instanceof SyntaxError
              ? "malformed JSON response"
              : `${e.status ?? e.code}`;
          logger.warnText(
            `Gemini API error: ${reason}, retrying attempt ${
              attempt + 1
            } in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw e;
      }
    }
    if (!response) {
      logger.warnText(
        `${label}: generateContent returned no response after retries, stopping`
      );
      break;
    }

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      logger.warnText(
        `${label}: agent finished without calling a terminal tool`
      );
      break;
    }

    const responseParts: {
      functionResponse: { name: string; response: Record<string, unknown> };
    }[] = [];

    for (const call of functionCalls) {
      const callArgs = (call.args ?? {}) as Record<string, unknown>;
      logger.info(`${label}: agent calling tool ${call.name}`);

      const result = await handleToolCall(call.name!, callArgs);
      if (result.done) {
        return result.result;
      }
      responseParts.push(result.response);
    }

    const modelParts = response.candidates?.[0]?.content?.parts;
    if (!modelParts) {
      logger.warnText(`${label}: empty response from Gemini, stopping`);
      break;
    }
    contents.push({ role: "model", parts: modelParts });
    contents.push({ role: "user", parts: responseParts });
  }

  logger.warnText(
    `${label}: exhausted ${maxIterations} iterations, returning default`
  );
  return defaultResult;
}
