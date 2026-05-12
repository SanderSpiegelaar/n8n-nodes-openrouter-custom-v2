import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { OpenRouterExecutionInput } from '../execution/OpenRouterExecution';
import { isUnset, validateNonEmptyText, validatePositiveNumber, validateRange } from './validation';

export function buildSamplingInput(
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
