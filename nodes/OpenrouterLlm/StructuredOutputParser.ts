import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type StructuredOutputMode = 'text' | 'json_object' | 'json_schema';

export type StructuredValidationIssue = {
	message: string;
	path: string;
	keyword?: string;
	schemaPath?: string;
	params?: Record<string, unknown>;
};

export type StructuredValidationResult =
	| { ok: true; value: unknown }
	| { ok: false; errors: string[]; details: StructuredValidationIssue[] };

const WRAPPER_KEYS = new Set(['json', 'structured', 'output', 'response', 'result', 'data']);

const ajvInstance = (() => {
	const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: false, removeAdditional: false });
	addFormats(ajv);
	return ajv;
})();

export function compileStructuredOutputSchema(schema: unknown): ValidateFunction {
	return ajvInstance.compile(schema as object);
}

export function extractStructuredJson(rawText: string): StructuredValidationResult {
	const candidates = collectJsonCandidates(rawText);
	const errors: string[] = [];

	for (const candidate of candidates) {
		try {
			return { ok: true, value: JSON.parse(candidate) };
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	const messages = errors.length > 0 ? errors : ['No JSON value found in response.'];
	return {
		ok: false,
		errors: messages,
		details: messages.map((message) => ({ message, path: '$' })),
	};
}

export function validateStructuredOutput(
	mode: StructuredOutputMode,
	rawText: string,
	compiledValidator: ValidateFunction | undefined,
): StructuredValidationResult {
	const extracted = extractStructuredJson(rawText);

	if (!extracted.ok) {
		return extracted;
	}

	const parsed = unwrapStructuredValue(extracted.value);

	if (mode === 'json_object') {
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			const message = 'Response must be a non-null JSON object.';
			return { ok: false, errors: [message], details: [{ message, path: '$' }] };
		}
		return { ok: true, value: parsed };
	}

	if (mode === 'json_schema' && compiledValidator !== undefined) {
		if (compiledValidator(parsed)) {
			return { ok: true, value: parsed };
		}
		const details = (compiledValidator.errors ?? []).map(formatAjvError);
		return { ok: false, errors: details.map((detail) => detail.message), details };
	}

	return { ok: true, value: parsed };
}

function collectJsonCandidates(rawText: string): string[] {
	const trimmed = rawText.trim();
	const candidates: string[] = [];

	if (trimmed !== '') {
		candidates.push(trimmed);
	}

	for (const fenced of extractFencedJson(trimmed)) {
		if (!candidates.includes(fenced)) {
			candidates.push(fenced);
		}
	}

	for (const embedded of extractBalancedJsonValues(trimmed)) {
		if (!candidates.includes(embedded)) {
			candidates.push(embedded);
		}
	}

	return candidates;
}

function extractFencedJson(text: string): string[] {
	const blocks: string[] = [];
	const fencePattern = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/g;
	let match: RegExpExecArray | null;

	while ((match = fencePattern.exec(text)) !== null) {
		const block = match[1]?.trim() ?? '';
		if (block !== '') {
			blocks.push(block);
		}
	}

	return blocks;
}

function extractBalancedJsonValues(text: string): string[] {
	const values: string[] = [];

	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (char !== '{' && char !== '[' && char !== '"' && !isPrimitiveStart(text, index)) {
			continue;
		}

		const end = findJsonEnd(text, index);
		if (end !== -1) {
			values.push(text.slice(index, end + 1).trim());
		}
	}

	return values;
}

function findJsonEnd(text: string, start: number): number {
	for (let end = start + 1; end <= text.length; end++) {
		const candidate = text.slice(start, end).trim();
		try {
			JSON.parse(candidate);
			return end - 1;
		} catch {
			// Keep extending until a complete JSON value is found.
		}
	}

	return -1;
}

function isPrimitiveStart(text: string, index: number): boolean {
	return (
		text.startsWith('true', index) ||
		text.startsWith('false', index) ||
		text.startsWith('null', index) ||
		/[\d-]/.test(text[index] ?? '')
	);
}

function unwrapStructuredValue(value: unknown): unknown {
	let current = value;

	for (let depth = 0; depth < 3; depth++) {
		if (current === null || typeof current !== 'object' || Array.isArray(current)) {
			return current;
		}

		const entries = Object.entries(current as Record<string, unknown>);
		if (entries.length !== 1) {
			return current;
		}

		const [key, wrappedValue] = entries[0];
		if (!WRAPPER_KEYS.has(key)) {
			return current;
		}

		current = wrappedValue;
	}

	return current;
}

function formatAjvError(error: ErrorObject): StructuredValidationIssue {
	const path = toReadablePath(error.instancePath ?? '');
	const message = formatReadableAjvMessage(error, path);
	return {
		message,
		path,
		keyword: error.keyword,
		schemaPath: error.schemaPath,
		params: error.params as Record<string, unknown>,
	};
}

function toReadablePath(instancePath: string): string {
	if (instancePath === '') {
		return '$';
	}

	return `$${instancePath.replace(/\/(\d+|[^/]+)/g, (_match, segment: string) => {
		const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
		return /^\d+$/.test(decoded) ? `[${decoded}]` : `.${decoded}`;
	})}`;
}

function formatReadableAjvMessage(error: ErrorObject, path: string): string {
	const baseMessage = error.message ?? 'is invalid';

	if (error.keyword === 'required' && 'missingProperty' in error.params) {
		return `${path} is missing required property "${String(error.params.missingProperty)}".`;
	}

	if (error.keyword === 'additionalProperties' && 'additionalProperty' in error.params) {
		return `${path} includes unsupported property "${String(error.params.additionalProperty)}".`;
	}

	return `${path} ${baseMessage}.`;
}
