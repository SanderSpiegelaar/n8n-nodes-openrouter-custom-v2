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

export type StructuredOutputRepairMetadata = {
	repaired: boolean;
	repairAttempts: number;
	latestRepairText: string;
};

export type StructuredOutputConfig = {
	mode: StructuredOutputMode;
	compiledValidator?: ValidateFunction;
	repair?: StructuredOutputRepairConfig;
};

export type StructuredOutputRepairConfig = {
	maxAttempts: number;
	model?: string;
	temperature?: number;
	reasoningEffort?: string;
	promptTemplate?: string;
	metadata?: (attempt: number, model: string) => unknown;
	send: StructuredOutputRepairSender;
};

export type StructuredOutputRepairSender = (body: StructuredOutputRepairRequestBody) => Promise<{
	text: string;
	response: unknown;
}>;

export type StructuredOutputRepairRequestBody = {
	model: string;
	messages: Array<{ role: 'user'; content: string }>;
	metadata?: unknown;
	temperature: number;
	reasoning: { effort: string };
	response_format: { type: 'json_object' };
};

export type StructuredOutputOutcome =
	| {
			ok: true;
			text: string;
			structured: unknown;
			response: unknown;
			repair: StructuredOutputRepairMetadata;
	  }
	| {
			ok: false;
			error: {
				message: string;
				validationErrors: string[];
				validationDetails: StructuredValidationIssue[];
				originalRawText: string;
				repair: StructuredOutputRepairMetadata;
			};
	  };

export const DEFAULT_REPAIR_MODEL = 'openai/gpt-oss-120b:nitro';
export const DEFAULT_REPAIR_TEMPERATURE = 0.1;
export const DEFAULT_REPAIR_REASONING_EFFORT = 'none';
export const DEFAULT_REPAIR_PROMPT_TEMPLATE = `You repair assistant output so it satisfies structured output validation.\n\nInstructions:\n{instructions}\n\nInvalid completion:\n{completion}\n\nValidation error:\n{error}\n\nReturn only the corrected JSON value. Do not include markdown fences or commentary.`;
const REQUIRED_REPAIR_PROMPT_PLACEHOLDERS = ['instructions', 'completion', 'error'] as const;

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

export function evaluateStructuredOutput(
	config: StructuredOutputConfig,
	initialText: string,
	initialResponse: unknown,
): StructuredOutputOutcome {
	return evaluateInitialStructuredOutput(config, initialText, initialResponse);
}

export async function evaluateStructuredOutputWithRepair(
	config: StructuredOutputConfig,
	initialText: string,
	initialResponse: unknown,
): Promise<StructuredOutputOutcome> {
	const initialOutcome = evaluateInitialStructuredOutput(config, initialText, initialResponse);

	if (initialOutcome.ok || config.repair === undefined || config.repair.maxAttempts <= 0) {
		return initialOutcome;
	}

	let validationErrors = initialOutcome.error.validationErrors;
	let validationDetails = initialOutcome.error.validationDetails;
	let latestRepairText = '';
	let latestResponse = initialResponse;

	for (let repairAttempt = 1; repairAttempt <= config.repair.maxAttempts; repairAttempt++) {
		const requestBody = buildStructuredOutputRepairRequestBody(config, repairAttempt + 1, {
			completion: latestRepairText || initialText,
			errors: validationErrors,
		});
		const repairResponse = await config.repair.send(requestBody);
		latestRepairText = repairResponse.text;
		latestResponse = repairResponse.response;

		const validation = validateStructuredOutput(
			config.mode,
			latestRepairText,
			config.compiledValidator,
		);

		if (validation.ok) {
			return {
				ok: true,
				text: stringifyStructuredValue(validation.value),
				structured: validation.value,
				response: latestResponse,
				repair: {
					repaired: true,
					repairAttempts: repairAttempt,
					latestRepairText,
				},
			};
		}

		validationErrors = validation.errors;
		validationDetails = validation.details;
	}

	return {
		ok: false,
		error: {
			message: `Structured output validation failed: ${validationErrors.join('; ')}`,
			validationErrors,
			validationDetails,
			originalRawText: initialText,
			repair: {
				repaired: false,
				repairAttempts: config.repair.maxAttempts,
				latestRepairText,
			},
		},
	};
}

function evaluateInitialStructuredOutput(
	config: StructuredOutputConfig,
	initialText: string,
	initialResponse: unknown,
): StructuredOutputOutcome {
	if (config.mode === 'text') {
		return {
			ok: true,
			text: initialText,
			structured: null,
			response: initialResponse,
			repair: createNoRepairMetadata(),
		};
	}

	const validation = validateStructuredOutput(config.mode, initialText, config.compiledValidator);

	if (validation.ok) {
		return {
			ok: true,
			text: initialText,
			structured: validation.value,
			response: initialResponse,
			repair: createNoRepairMetadata(),
		};
	}

	return {
		ok: false,
		error: {
			message: `Structured output validation failed: ${validation.errors.join('; ')}`,
			validationErrors: validation.errors,
			validationDetails: validation.details,
			originalRawText: initialText,
			repair: createNoRepairMetadata(),
		},
	};
}

export function buildStructuredOutputRepairRequestBody(
	config: StructuredOutputConfig,
	attempt: number,
	failure: { errors: string[]; completion: string },
): StructuredOutputRepairRequestBody {
	if (config.repair === undefined) {
		throw new Error('Structured Output Repair config is required.');
	}

	const model = config.repair.model ?? DEFAULT_REPAIR_MODEL;
	const body: StructuredOutputRepairRequestBody = {
		model,
		messages: [
			{
				role: 'user',
				content: buildStructuredOutputRepairPrompt(config.mode, config.repair.promptTemplate, failure),
			},
		],
		temperature: config.repair.temperature ?? DEFAULT_REPAIR_TEMPERATURE,
		reasoning: { effort: config.repair.reasoningEffort ?? DEFAULT_REPAIR_REASONING_EFFORT },
		response_format: { type: 'json_object' },
	};

	const metadata = config.repair.metadata?.(attempt, model);
	if (metadata !== undefined) {
		body.metadata = metadata;
	}

	return body;
}

export function buildStructuredOutputRepairPrompt(
	mode: StructuredOutputMode,
	promptTemplate: string | undefined,
	failure: { errors: string[]; completion: string },
): string {
	const template = promptTemplate?.trim() ? promptTemplate : DEFAULT_REPAIR_PROMPT_TEMPLATE;
	validateStructuredOutputRepairPromptTemplate(template);

	const instructions =
		mode === 'json_schema'
			? 'Repair the completion so it validates against the configured JSON Schema.'
			: 'Repair the completion so it is a non-array JSON object.';

	return template
		.split('{instructions}')
		.join(instructions)
		.split('{completion}')
		.join(failure.completion)
		.split('{error}')
		.join(failure.errors.slice(0, 5).join('\n'));
}

export function validateStructuredOutputRepairPromptTemplate(template: string): void {
	for (const placeholder of REQUIRED_REPAIR_PROMPT_PLACEHOLDERS) {
		if (!template.includes(`{${placeholder}}`)) {
			throw new Error(`Repair Prompt Template is missing required placeholder {${placeholder}}.`);
		}
	}
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

function createNoRepairMetadata(): StructuredOutputRepairMetadata {
	return {
		repaired: false,
		repairAttempts: 0,
		latestRepairText: '',
	};
}

function stringifyStructuredValue(value: unknown): string {
	return JSON.stringify(value);
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
