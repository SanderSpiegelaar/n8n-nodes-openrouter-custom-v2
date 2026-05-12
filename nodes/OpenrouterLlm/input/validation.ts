import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function validatePositiveNumber(
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

export function validateRange(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): number {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must be between 0 and 1.`);
	}

	return numericValue;
}

export function validateNonEmptyText(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	label: string,
): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
	}

	return value;
}

export function isUnset(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}
