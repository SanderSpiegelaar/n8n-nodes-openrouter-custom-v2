import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { validatePositiveNumber } from './validation';

export function buildReasoning(
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
