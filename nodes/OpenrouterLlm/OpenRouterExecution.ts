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

export async function executeOpenRouter({
	input,
	sendChat,
}: {
	input: OpenRouterExecutionInput;
	sendChat: OpenRouterChatSender;
}): Promise<OpenRouterExecutionResult> {
	const requestBody = buildInitialRequestBody(input, 1);
	const { response, text } = await sendChat(requestBody);
	const finalResponse = applyReasoningExclusion(response, input.reasoning);

	return {
		kind: 'success',
		data: {
			text,
			structured: null,
			response: finalResponse,
		},
	};
}

export function buildInitialRequestBody(
	input: OpenRouterExecutionInput,
	attempt: number,
): ChatCompletionRequestBody {
	const body: ChatCompletionRequestBody = {
		...buildModelPayload(input.modelRouting),
		messages: input.messages,
	};

	const metadata = buildMetadata(input, attempt);
	if (metadata !== undefined) {
		body.metadata = metadata;
	}

	addSampling(body, input.sampling);

	if (input.reasoning?.request !== undefined) {
		body.reasoning = input.reasoning.request;
	}

	if (input.provider !== undefined) {
		body.provider = input.provider;
	}

	if (input.plugins !== undefined && input.plugins.length > 0) {
		body.plugins = input.plugins;
	}

	if (input.sessionId !== undefined && input.sessionId !== '') {
		body.session_id = input.sessionId;
	}

	return body;
}

function buildModelPayload(modelRouting: ModelRoutingInput): { model: string } | { models: string[] } {
	const fallbackModels = modelRouting.fallbackModels ?? [];

	if (fallbackModels.length > 0) {
		return { models: [modelRouting.primaryModel, ...fallbackModels] };
	}

	return { model: modelRouting.primaryModel };
}

function buildMetadata(
	input: OpenRouterExecutionInput,
	attempt: number,
): OpenRouterCompatibleObject | undefined {
	if (input.metadata === undefined) {
		return undefined;
	}

	return {
		execution_id: input.metadata.defaults.executionId,
		workflow_id: input.metadata.defaults.workflowId,
		workflow_name: input.metadata.defaults.workflowName,
		node_name: input.metadata.defaults.nodeName,
		item_index: input.metadata.defaults.itemIndex,
		model: input.modelRouting.primaryModel,
		validation_attempt: attempt,
		...(input.metadata.extras ?? {}),
	};
}

function addSampling(body: OpenRouterCompatibleObject, sampling: SamplingInput | undefined): void {
	if (sampling === undefined) {
		return;
	}

	addIfSet(body, 'temperature', sampling.temperature);
	addIfSet(body, 'max_tokens', sampling.maxTokens);
	addIfSet(body, 'top_p', sampling.topP);
	addIfSet(body, 'frequency_penalty', sampling.frequencyPenalty);
	addIfSet(body, 'presence_penalty', sampling.presencePenalty);
	addIfSet(body, 'prompt_cache_key', sampling.promptCacheKey);
	addIfSet(body, 'seed', sampling.seed);
	addIfSet(body, 'stop', sampling.stop);
	addIfSet(body, 'top_k', sampling.topK);
	addIfSet(body, 'repetition_penalty', sampling.repetitionPenalty);
	addIfSet(body, 'min_p', sampling.minP);
	addIfSet(body, 'top_a', sampling.topA);

	if (sampling.transforms !== undefined && sampling.transforms.length > 0) {
		body.transforms = sampling.transforms;
	}
}

function addIfSet(body: OpenRouterCompatibleObject, wireName: string, value: unknown): void {
	if (value !== undefined && value !== null && value !== '') {
		body[wireName] = value;
	}
}

function applyReasoningExclusion(
	response: ChatCompletionResponse,
	reasoning: ReasoningInput | undefined,
): ChatCompletionResponse {
	if (reasoning?.excludeFromResponse !== true || response.choices === undefined) {
		return response;
	}

	for (const choice of response.choices) {
		if (choice.message !== undefined) {
			delete choice.message.reasoning;
			delete choice.message.reasoning_content;
		}
	}

	return response;
}
