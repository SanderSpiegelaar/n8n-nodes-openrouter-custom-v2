import { type StructuredOutputConfig, type StructuredValidationIssue } from '../structured-output/StructuredOutputParser';
export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};
export type OpenRouterCompatibleObject = Record<string, unknown>;
export type ChatCompletionResponse = OpenRouterCompatibleObject & {
    choices?: Array<{
        message?: {
            content?: string;
            reasoning?: unknown;
            reasoning_content?: unknown;
        };
    }>;
};
export type ChatCompletionRequestBody = OpenRouterCompatibleObject & {
    model?: string;
    models?: string[];
    messages: ChatMessage[];
    metadata?: OpenRouterCompatibleObject;
};
export type OpenRouterChatSender = (body: ChatCompletionRequestBody) => Promise<{
    response: ChatCompletionResponse;
    text: string;
}>;
export type ModelRoutingInput = {
    primaryModel: string;
    fallbackModels?: string[];
};
export type SamplingInput = {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    promptCacheKey?: string;
    seed?: number;
    stop?: string | string[];
    topK?: number;
    repetitionPenalty?: number;
    minP?: number;
    topA?: number;
    transforms?: string[];
};
export type MetadataContext = {
    defaults: {
        executionId: string;
        workflowId: string;
        workflowName: string;
        nodeName: string;
        itemIndex: number;
    };
    extras?: Record<string, unknown>;
};
export type ReasoningInput = {
    request?: OpenRouterCompatibleObject;
    excludeFromResponse?: boolean;
};
export type OpenRouterExecutionInput = {
    modelRouting: ModelRoutingInput;
    messages: ChatMessage[];
    outputMode: 'text' | 'json_object' | 'json_schema';
    sampling?: SamplingInput;
    metadata?: MetadataContext;
    provider?: OpenRouterCompatibleObject;
    plugins?: OpenRouterCompatibleObject[];
    sessionId?: string;
    reasoning?: ReasoningInput;
    structuredOutput?: StructuredOutputExecutionConfig;
};
export type StructuredOutputExecutionConfig = Omit<StructuredOutputConfig, 'repair'> & {
    responseFormat?: OpenRouterCompatibleObject;
    repair?: Omit<NonNullable<StructuredOutputConfig['repair']>, 'send'>;
};
export type OpenRouterExecutionData = Record<string, unknown>;
export type OpenRouterExecutionSuccess = {
    kind: 'success';
    data: OpenRouterExecutionData;
};
export type OpenRouterExecutionStructuredOutputFailure = {
    kind: 'structured_output';
    error: {
        message: string;
        validationErrors: string[];
        validationDetails: StructuredOutputFailureDetails;
        originalRawText: string;
        latestRepairText: string;
        repairAttempts: number;
    };
};
type StructuredOutputFailureDetails = StructuredValidationIssue[];
export type OpenRouterExecutionResult = OpenRouterExecutionSuccess | OpenRouterExecutionStructuredOutputFailure;
export declare function executeOpenRouter({ input, sendChat, }: {
    input: OpenRouterExecutionInput;
    sendChat: OpenRouterChatSender;
}): Promise<OpenRouterExecutionResult>;
export declare function buildInitialRequestBody(input: OpenRouterExecutionInput, attempt: number): ChatCompletionRequestBody;
export {};
