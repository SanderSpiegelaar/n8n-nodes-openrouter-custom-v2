import type { IDataObject } from 'n8n-workflow';
export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};
export type OpenRouterCompatibleObject = Record<string, unknown>;
export type ChatCompletionResponse = IDataObject & {
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
    outputMode: 'text';
    sampling?: SamplingInput;
    metadata?: MetadataContext;
    provider?: OpenRouterCompatibleObject;
    plugins?: OpenRouterCompatibleObject[];
    sessionId?: string;
    reasoning?: ReasoningInput;
};
export type OpenRouterExecutionSuccess = {
    kind: 'success';
    data: IDataObject;
};
export type OpenRouterExecutionResult = OpenRouterExecutionSuccess;
export declare function executeOpenRouter({ input, sendChat, }: {
    input: OpenRouterExecutionInput;
    sendChat: OpenRouterChatSender;
}): Promise<OpenRouterExecutionResult>;
export declare function buildInitialRequestBody(input: OpenRouterExecutionInput, attempt: number): ChatCompletionRequestBody;
