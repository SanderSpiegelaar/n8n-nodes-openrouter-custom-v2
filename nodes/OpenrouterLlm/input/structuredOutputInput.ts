import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import {
	DEFAULT_REPAIR_MODEL,
	DEFAULT_REPAIR_REASONING_EFFORT,
	DEFAULT_REPAIR_TEMPERATURE,
} from '../structured-output/StructuredOutputParser';
import type { OpenRouterExecutionInput } from '../execution/OpenRouterExecution';
import { resolveModelLocator, type ModelLocatorValue } from '../routing/OpenRouterRouting';
import type { CompiledStructuredSchema, OutputMode } from '../execution/OpenRouterExecutionInputBuilder';
import { buildMetadata } from './metadataInput';
import { isUnset } from './validation';

export function buildStructuredOutputExecutionConfig(
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
