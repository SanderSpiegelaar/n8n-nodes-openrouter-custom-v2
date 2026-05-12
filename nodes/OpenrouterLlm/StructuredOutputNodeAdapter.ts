import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	compileStructuredOutputSchema,
	type StructuredValidationIssue,
} from './StructuredOutputParser';
import type {
	CompiledStructuredSchema,
	JsonSchemaResponseFormat,
} from './OpenRouterExecutionInputBuilder';

export type StructuredOutputFailureDiagnostics = {
	errors: string[];
	details: StructuredValidationIssue[];
	originalRawText: string;
	latestRepairText: string;
};

export function compileSchema(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): CompiledStructuredSchema {
	const raw = executeFunctions.getNodeParameter('jsonSchema', itemIndex) as unknown;
	let parsed: unknown = raw;

	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`JSON Schema parse failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	const responseFormat = normalizeJsonSchemaResponseFormat(parsed);

	try {
		return {
			validator: compileStructuredOutputSchema(responseFormat.schema),
			responseFormat,
		};
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`JSON Schema compile failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function normalizeJsonSchemaResponseFormat(parsed: unknown): JsonSchemaResponseFormat {
	if (isOpenAiJsonSchemaWrapper(parsed)) {
		return {
			name: typeof parsed.name === 'string' && parsed.name.trim() !== '' ? parsed.name : 'response',
			schema: parsed.schema,
			strict: typeof parsed.strict === 'boolean' ? parsed.strict : true,
		};
	}

	return { name: 'response', schema: parsed, strict: true };
}

export function isOpenAiJsonSchemaWrapper(
	value: unknown,
): value is { name?: unknown; schema: unknown; strict?: unknown } {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.prototype.hasOwnProperty.call(value, 'schema') &&
		(Object.prototype.hasOwnProperty.call(value, 'name') ||
			Object.prototype.hasOwnProperty.call(value, 'strict'))
	);
}

export function buildStructuredOutputError(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	attempt: number,
	diagnostics: StructuredOutputFailureDiagnostics,
): NodeOperationError {
	const error = new NodeOperationError(
		executeFunctions.getNode(),
		`Structured output validation failed after ${attempt} attempts: ${diagnostics.errors.join('; ')}. Raw model text: ${truncateForError(diagnostics.latestRepairText || diagnostics.originalRawText)}`,
		{
			itemIndex,
			description: JSON.stringify({
				validationErrors: diagnostics.errors,
				validationDetails: diagnostics.details,
				originalOutputText: truncateForError(diagnostics.originalRawText),
				latestRepairText:
					diagnostics.latestRepairText === ''
						? undefined
						: truncateForError(diagnostics.latestRepairText),
			}),
		},
	);

	return Object.assign(error, { structuredOutputDiagnostics: diagnostics });
}

export function getStructuredOutputDiagnosticFields(error: unknown): IDataObject {
	const diagnostics = (
		error as { structuredOutputDiagnostics?: StructuredOutputFailureDiagnostics }
	)?.structuredOutputDiagnostics;

	if (diagnostics === undefined) {
		return {};
	}

	return {
		structuredOutputValidationErrors: diagnostics.errors,
		structuredOutputValidationDetails: diagnostics.details as unknown as IDataObject[],
		structuredOutputOriginalText: diagnostics.originalRawText,
		structuredOutputLatestRepairText: diagnostics.latestRepairText,
	};
}

export function truncateForError(text: string): string {
	const limit = 2000;
	return text.length <= limit ? text : `${text.slice(0, limit)}...[truncated]`;
}
