import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { ValidateFunction } from 'ajv';
import { type StructuredOutputMode } from '../structured-output/StructuredOutputParser';
import type { OpenRouterExecutionInput } from './OpenRouterExecution';
import { resolveFallbackModels, resolvePrimaryModel } from '../routing/OpenRouterRouting';
import { buildMessages } from '../input/messageInput';
import { buildMetadataExtras } from '../input/metadataInput';
import { buildPlugins, buildWebPlugin } from '../input/pluginInput';
import { buildReasoning } from '../input/reasoningInput';
import { buildSamplingInput } from '../input/samplingInput';
import { buildStructuredOutputExecutionConfig } from '../input/structuredOutputInput';

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

export { buildWebPlugin };

export function buildOpenRouterExecutionInput(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	provider: IDataObject | undefined,
	outputMode: OutputMode,
	compiledSchema: CompiledStructuredSchema | undefined,
	maxRepairAttempts: number,
): OpenRouterExecutionInput {
	const workflow = executeFunctions.getWorkflow();
	const reasoningParameters = executeFunctions.getNodeParameter(
		'reasoning',
		itemIndex,
		{},
	) as IDataObject;
	const reasoning = buildReasoning(executeFunctions, reasoningParameters);
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
			excludeFromResponse: (reasoningParameters.exclude as boolean | undefined) === true,
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
