import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ValidateFunction } from 'ajv';
import {
	DEFAULT_REPAIR_MODEL,
	DEFAULT_REPAIR_REASONING_EFFORT,
	DEFAULT_REPAIR_TEMPERATURE,
	type StructuredOutputMode,
} from './StructuredOutputParser';
import type { ChatMessage, OpenRouterExecutionInput } from './OpenRouterExecution';

const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;
const SUPPORTED_MODEL_VARIANTS = [
	':exacto',
	':extended',
	':floor',
	':free',
	':nitro',
	':online',
] as const;

type ModelLocatorValue =
	| string
	| {
			value?: string;
	  };

export type OutputMode = StructuredOutputMode;

export type JsonSchemaResponseFormat = {
	name: string;
	schema: unknown;
	strict: boolean;
};

export type CompiledStructuredSchema = {
	validator: ValidateFunction;
	responseFormat: JsonSchemaResponseFormat;
};

export function buildOpenRouterExecutionInput(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	provider: IDataObject | undefined,
	outputMode: OutputMode,
	compiledSchema: CompiledStructuredSchema | undefined,
	maxRepairAttempts: number,
): OpenRouterExecutionInput {
	const workflow = executeFunctions.getWorkflow();
	const reasoning = buildReasoning(
		executeFunctions,
		executeFunctions.getNodeParameter('reasoning', itemIndex, {}) as IDataObject,
	);
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const sessionId = (integrations.sessionId as string | undefined) ?? '';
	const primaryModel = resolvePrimaryModel(executeFunctions, itemIndex);

	return {
		modelRouting: {
			primaryModel,
			fallbackModels: resolveFallbackModels(executeFunctions, itemIndex),
		},
		messages: buildMessages(executeFunctions, itemIndex),
		outputMode,
		sampling: buildSamplingInput(executeFunctions, itemIndex),
		metadata: {
			defaults: {
				executionId: executeFunctions.getExecutionId(),
				workflowId: workflow.id ?? '',
				workflowName: workflow.name ?? '',
				nodeName: executeFunctions.getNode().name,
				itemIndex,
			},
			extras: buildMetadataExtras(executeFunctions, itemIndex),
		},
		provider: provider as OpenRouterExecutionInput['provider'],
		plugins: buildPlugins(executeFunctions, itemIndex) as OpenRouterExecutionInput['plugins'],
		sessionId,
		reasoning: {
			request: reasoning,
			excludeFromResponse:
				((executeFunctions.getNodeParameter('reasoning', itemIndex, {}) as IDataObject).exclude as
					| boolean
					| undefined) === true,
		},
		structuredOutput: buildStructuredOutputExecutionConfig(
			executeFunctions,
			itemIndex,
			outputMode,
			compiledSchema,
			maxRepairAttempts,
		),
	};
}

function buildStructuredOutputExecutionConfig(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	outputMode: OutputMode,
	compiledSchema: CompiledStructuredSchema | undefined,
	maxRepairAttempts: number,
): OpenRouterExecutionInput['structuredOutput'] {
	if (outputMode === 'text') {
		return undefined;
	}

	const repair = executeFunctions.getNodeParameter('repair', itemIndex, {}) as IDataObject;
	const repairModel = resolveModelLocator(
		repair.model as ModelLocatorValue | undefined,
		DEFAULT_REPAIR_MODEL,
	);

	return {
		mode: outputMode,
		compiledValidator: compiledSchema?.validator,
		responseFormat: compiledSchema?.responseFormat,
		repair: {
			maxAttempts: maxRepairAttempts,
			model: repairModel,
			temperature: isUnset(repair.temperature)
				? DEFAULT_REPAIR_TEMPERATURE
				: (repair.temperature as number),
			reasoningEffort:
				(repair.reasoningEffort as string | undefined) ?? DEFAULT_REPAIR_REASONING_EFFORT,
			promptTemplate: repair.promptTemplate as string | undefined,
			metadata: (attempt, model) => buildMetadata(executeFunctions, itemIndex, model, attempt),
		},
	};
}

function buildSamplingInput(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): OpenRouterExecutionInput['sampling'] {
	const generation = executeFunctions.getNodeParameter('generation', itemIndex, {}) as IDataObject;
	const advancedSampling = executeFunctions.getNodeParameter(
		'advancedSampling',
		itemIndex,
		{},
	) as IDataObject;

	return {
		temperature: isUnset(generation.temperature) ? undefined : (generation.temperature as number),
		maxTokens: isUnset(generation.maxTokens)
			? undefined
			: validatePositiveNumber(executeFunctions, generation.maxTokens, 'Max Tokens'),
		topP: isUnset(generation.topP) ? undefined : (generation.topP as number),
		frequencyPenalty: isUnset(generation.frequencyPenalty)
			? undefined
			: (generation.frequencyPenalty as number),
		presencePenalty: isUnset(generation.presencePenalty)
			? undefined
			: (generation.presencePenalty as number),
		promptCacheKey: isUnset(generation.promptCacheKey)
			? undefined
			: validateNonEmptyText(executeFunctions, generation.promptCacheKey, 'Prompt Cache Key'),
		seed: isUnset(generation.seed) ? undefined : (generation.seed as number),
		stop: isUnset(generation.stop) ? undefined : (generation.stop as string),
		topK: isUnset(advancedSampling.topK)
			? undefined
			: validatePositiveNumber(executeFunctions, advancedSampling.topK, 'Top K'),
		repetitionPenalty: isUnset(advancedSampling.repetitionPenalty)
			? undefined
			: validatePositiveNumber(
					executeFunctions,
					advancedSampling.repetitionPenalty,
					'Repetition Penalty',
				),
		minP: isUnset(advancedSampling.minP)
			? undefined
			: validateRange(executeFunctions, advancedSampling.minP, 'Min P'),
		topA: isUnset(advancedSampling.topA)
			? undefined
			: validateRange(executeFunctions, advancedSampling.topA, 'Top A'),
		transforms:
			Array.isArray(advancedSampling.transforms) && advancedSampling.transforms.length > 0
				? (advancedSampling.transforms as string[])
				: undefined,
	};
}

function buildMetadataExtras(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Record<string, unknown> {
	const defaults = buildMetadata(
		executeFunctions,
		itemIndex,
		resolvePrimaryModel(executeFunctions, itemIndex),
	);
	const extras = { ...defaults } as Record<string, unknown>;
	const defaultKeys = new Set([
		'execution_id',
		'workflow_id',
		'workflow_name',
		'node_name',
		'item_index',
		'model',
		'validation_attempt',
	]);

	for (const key of Object.keys(defaults)) {
		if (defaultKeys.has(key)) {
			delete extras[key];
		}
	}

	return extras;
}

function buildPlugins(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject[] {
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const plugins: IDataObject[] = [];

	if ((integrations.responseHealing as boolean | undefined) ?? false) {
		plugins.push({ id: 'response-healing' });
	}

	const webPlugin = buildWebPlugin(executeFunctions, itemIndex);

	if (webPlugin !== undefined) {
		plugins.push(webPlugin);
	}

	return plugins;
}

function buildMetadata(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	model: string,
	attempt: number = 1,
): IDataObject {
	const workflow = executeFunctions.getWorkflow();
	const defaultMetadata: IDataObject = {
		execution_id: executeFunctions.getExecutionId(),
		workflow_id: workflow.id,
		workflow_name: workflow.name,
		node_name: executeFunctions.getNode().name,
		item_index: itemIndex,
		model,
		validation_attempt: attempt,
	};
	const metadata = { ...defaultMetadata };
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const extraMetadata =
		(integrations.metadata as
			| {
					values?: Array<{ key?: string; valueMode?: string; value?: string }>;
			  }
			| undefined) ?? {};

	for (const row of extraMetadata.values ?? []) {
		const key = row.key?.trim() ?? '';

		if (key === '') {
			continue;
		}

		if (Object.prototype.hasOwnProperty.call(defaultMetadata, key)) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`${key} conflicts with default metadata.`,
			);
		}

		if (row.valueMode === 'json') {
			try {
				metadata[key] = JSON.parse(row.value ?? '');
			} catch {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`${key} metadata value must be valid JSON.`,
				);
			}
			continue;
		}

		metadata[key] = row.value ?? '';
	}

	return metadata;
}

function buildReasoning(
	executeFunctions: IExecuteFunctions,
	reasoning: IDataObject,
): IDataObject | undefined {
	const mode = (reasoning.mode as string | undefined) ?? 'off';
	const exclude = reasoning.exclude === true;

	if (mode === 'off' && !exclude) {
		return undefined;
	}

	const output: IDataObject = {};

	if (mode === 'effort') {
		output.effort = (reasoning.effort as string | undefined) ?? 'medium';
	}

	if (mode === 'tokenBudget') {
		output.max_tokens = validatePositiveNumber(
			executeFunctions,
			reasoning.maxTokens,
			'Reasoning Max Tokens',
		);
	}

	if (exclude) {
		output.exclude = true;
	}

	return output;
}

function validatePositiveNumber(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): number {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue) || numericValue <= 0) {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must be greater than 0.`);
	}

	return numericValue;
}

function validateRange(executeFunctions: IExecuteFunctions, value: unknown, label: string): number {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must be between 0 and 1.`);
	}

	return numericValue;
}

function isUnset(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function resolvePrimaryModel(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const modelParameter = executeFunctions.getNodeParameter('model', itemIndex) as ModelLocatorValue;
	const modelId = resolveModelLocator(modelParameter, '');
	const modelOptions = executeFunctions.getNodeParameter(
		'modelOptions',
		itemIndex,
		{},
	) as IDataObject;
	const modelVariant = (modelOptions.modelVariant as string | undefined) ?? '';

	if (modelId.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), 'Model ID must not be empty.');
	}

	if (modelVariant === '') {
		return modelId;
	}

	if (
		!SUPPORTED_MODEL_VARIANTS.includes(modelVariant as (typeof SUPPORTED_MODEL_VARIANTS)[number])
	) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Unsupported model variant selected.');
	}

	return `${stripSupportedVariant(modelId)}${modelVariant}`;
}

function resolveModelLocator(
	modelParameter: ModelLocatorValue | undefined,
	defaultModel: string,
): string {
	if (modelParameter === undefined) {
		return defaultModel;
	}

	return typeof modelParameter === 'string'
		? modelParameter
		: (modelParameter.value ?? defaultModel).toString();
}

function resolveFallbackModels(executeFunctions: IExecuteFunctions, itemIndex: number): string[] {
	const modelOptions = executeFunctions.getNodeParameter(
		'modelOptions',
		itemIndex,
		{},
	) as IDataObject;
	const fallbackModels =
		(modelOptions.fallbackModels as
			| {
					values?: Array<{ model?: string }>;
			  }
			| undefined) ?? {};

	return (fallbackModels.values ?? [])
		.map((fallback) => fallback.model?.trim() ?? '')
		.filter((model) => model !== '');
}

function stripSupportedVariant(modelId: string): string {
	const supportedVariant = SUPPORTED_MODEL_VARIANTS.find((variant) => modelId.endsWith(variant));

	if (!supportedVariant) {
		return modelId;
	}

	return modelId.slice(0, -supportedVariant.length);
}

function buildMessages(executeFunctions: IExecuteFunctions, itemIndex: number): ChatMessage[] {
	const promptMode = executeFunctions.getNodeParameter(
		'promptMode',
		itemIndex,
		'systemUser',
	) as string;

	if (promptMode === 'single') {
		const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex) as string;

		return [
			{
				role: 'user',
				content: validateNonEmptyText(executeFunctions, singlePrompt, 'Prompt'),
			},
		];
	}

	if (promptMode === 'messagesJson') {
		const messagesJson = executeFunctions.getNodeParameter('messagesJson', itemIndex) as unknown;

		return validateMessagesJson(executeFunctions, messagesJson);
	}

	const prompt = executeFunctions.getNodeParameter('prompt', itemIndex) as string;
	const systemMessage = executeFunctions.getNodeParameter('systemMessage', itemIndex, '') as string;
	const messages: ChatMessage[] = [];

	if (systemMessage.trim() !== '') {
		messages.push({
			role: 'system',
			content: systemMessage,
		});
	}

	messages.push({
		role: 'user',
		content: validateNonEmptyText(executeFunctions, prompt, 'User Prompt'),
	});

	return messages;
}

function validateMessagesJson(executeFunctions: IExecuteFunctions, value: unknown): ChatMessage[] {
	let parsedValue = value;

	if (typeof value === 'string') {
		try {
			parsedValue = JSON.parse(value);
		} catch {
			throw new NodeOperationError(executeFunctions.getNode(), 'Messages JSON must be valid JSON.');
		}
	}

	if (!Array.isArray(parsedValue)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Messages JSON must resolve to an array.',
		);
	}

	if (parsedValue.length === 0) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Messages JSON must contain at least one message.',
		);
	}

	return parsedValue.map((message, index) => validateMessage(executeFunctions, message, index));
}

function validateMessage(
	executeFunctions: IExecuteFunctions,
	message: unknown,
	index: number,
): ChatMessage {
	const messageNumber = index + 1;

	if (message === null || typeof message !== 'object' || Array.isArray(message)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Message ${messageNumber} must be an object.`,
		);
	}

	const candidate = message as IDataObject;
	const role = candidate.role;

	if (
		typeof role !== 'string' ||
		!VALID_MESSAGE_ROLES.includes(role as (typeof VALID_MESSAGE_ROLES)[number])
	) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Message ${messageNumber} role must be one of system, user, assistant.`,
		);
	}

	return {
		role: role as ChatMessage['role'],
		content: validateNonEmptyText(
			executeFunctions,
			candidate.content,
			`Message ${messageNumber} content`,
		),
	};
}

function validateNonEmptyText(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
	}

	return value;
}

export function buildWebPlugin(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;

	if (integrations.webEnabled !== true) {
		return undefined;
	}

	const plugin: IDataObject = { id: 'web' };

	if (!isUnset(integrations.webMaxResults)) {
		plugin.max_results = validatePositiveNumber(
			executeFunctions,
			integrations.webMaxResults,
			'Web Search Max Results',
		);
	}

	if (
		typeof integrations.webSearchPrompt === 'string' &&
		(integrations.webSearchPrompt as string).trim() !== ''
	) {
		plugin.search_prompt = integrations.webSearchPrompt;
	}

	return plugin;
}
