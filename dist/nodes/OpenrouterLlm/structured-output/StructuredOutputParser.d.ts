import { type ValidateFunction } from 'ajv';
export type StructuredOutputMode = 'text' | 'json_object' | 'json_schema';
export type StructuredValidationIssue = {
    message: string;
    path: string;
    keyword?: string;
    schemaPath?: string;
    params?: Record<string, unknown>;
};
export type StructuredValidationResult = {
    ok: true;
    value: unknown;
} | {
    ok: false;
    errors: string[];
    details: StructuredValidationIssue[];
};
export type StructuredOutputRepairMetadata = {
    repaired: boolean;
    repairAttempts: number;
    latestRepairText: string;
};
export type StructuredOutputConfig = {
    mode: StructuredOutputMode;
    compiledValidator?: ValidateFunction;
    repair?: StructuredOutputRepairConfig;
};
export type StructuredOutputRepairConfig = {
    maxAttempts: number;
    model?: string;
    temperature?: number;
    reasoningEffort?: string;
    promptTemplate?: string;
    metadata?: (attempt: number, model: string) => unknown;
    send: StructuredOutputRepairSender;
};
export type StructuredOutputRepairSender = (body: StructuredOutputRepairRequestBody) => Promise<{
    text: string;
    response: unknown;
}>;
export type StructuredOutputRepairRequestBody = {
    model: string;
    messages: Array<{
        role: 'user';
        content: string;
    }>;
    metadata?: unknown;
    temperature: number;
    reasoning: {
        effort: string;
    };
    response_format: {
        type: 'json_object';
    };
};
export type StructuredOutputOutcome = {
    ok: true;
    text: string;
    structured: unknown;
    response: unknown;
    repair: StructuredOutputRepairMetadata;
} | {
    ok: false;
    error: {
        message: string;
        validationErrors: string[];
        validationDetails: StructuredValidationIssue[];
        originalRawText: string;
        repair: StructuredOutputRepairMetadata;
    };
};
export declare const DEFAULT_REPAIR_MODEL = "openai/gpt-oss-120b:nitro";
export declare const DEFAULT_REPAIR_TEMPERATURE = 0.1;
export declare const DEFAULT_REPAIR_REASONING_EFFORT = "none";
export declare const DEFAULT_REPAIR_PROMPT_TEMPLATE = "You repair assistant output so it satisfies structured output validation.\n\nInstructions:\n{instructions}\n\nInvalid completion:\n{completion}\n\nValidation error:\n{error}\n\nReturn only the corrected JSON value. Do not include markdown fences or commentary.";
export declare function compileStructuredOutputSchema(schema: unknown): ValidateFunction;
export declare function extractStructuredJson(rawText: string): StructuredValidationResult;
export declare function evaluateStructuredOutput(config: StructuredOutputConfig, initialText: string, initialResponse: unknown): StructuredOutputOutcome;
export declare function evaluateStructuredOutputWithRepair(config: StructuredOutputConfig, initialText: string, initialResponse: unknown): Promise<StructuredOutputOutcome>;
export declare function buildStructuredOutputRepairRequestBody(config: StructuredOutputConfig, attempt: number, failure: {
    errors: string[];
    completion: string;
}): StructuredOutputRepairRequestBody;
export declare function buildStructuredOutputRepairPrompt(mode: StructuredOutputMode, promptTemplate: string | undefined, failure: {
    errors: string[];
    completion: string;
}): string;
export declare function validateStructuredOutputRepairPromptTemplate(template: string): void;
export declare function validateStructuredOutput(mode: StructuredOutputMode, rawText: string, compiledValidator: ValidateFunction | undefined): StructuredValidationResult;
