const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/openrouter-test-context.js');

test('Openrouter LLM in json_object mode sends response_format and returns parsed structured payload', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '{"answer":42}' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.deepEqual(requests[0].body.response_format, { type: 'json_object' });
	assert.equal(requests.length, 1);
	assert.deepEqual(result[0][0].json.structured, { answer: 42 });
	assert.equal(requests[0].body.metadata.validation_attempt, 1);
});


test('structured parser extracts raw, fenced, and prose-embedded JSON values', () => {
	const {
		extractStructuredJson,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');

	assert.deepEqual(extractStructuredJson('{"answer":42}'), { ok: true, value: { answer: 42 } });
	assert.deepEqual(extractStructuredJson('```json\n{"answer":42}\n```'), {
		ok: true,
		value: { answer: 42 },
	});
	assert.deepEqual(extractStructuredJson('Here is the answer: {"answer":42}. Thanks.'), {
		ok: true,
		value: { answer: 42 },
	});
});


test('structured output outcome returns valid initial structured data without n8n runtime dependencies', () => {
	const {
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const response = { id: 'gen-1', choices: [{ message: { content: '{"answer":42}' } }] };

	const result = evaluateStructuredOutput({ mode: 'json_object' }, '{"answer":42}', response);

	assert.deepEqual(result, {
		ok: true,
		text: '{"answer":42}',
		structured: { answer: 42 },
		response,
		repair: { repaired: false, repairAttempts: 0, latestRepairText: '' },
	});
});


test('structured output outcome returns diagnostic failure data before repair is wired in', () => {
	const {
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');

	const result = evaluateStructuredOutput({ mode: 'json_object' }, '[1,2,3]', { id: 'gen-1' });

	assert.equal(result.ok, false);
	assert.match(result.error.message, /non-null JSON object/i);
	assert.deepEqual(result.error.validationErrors, ['Response must be a non-null JSON object.']);
	assert.equal(result.error.validationDetails[0].path, '$');
	assert.equal(result.error.originalRawText, '[1,2,3]');
	assert.deepEqual(result.error.repair, {
		repaired: false,
		repairAttempts: 0,
		latestRepairText: '',
	});
});


test('structured output json_object mode requires a non-null non-array object', () => {
	const {
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');

	const valid = evaluateStructuredOutput({ mode: 'json_object' }, '{"answer":42}', { id: 'gen-1' });
	const invalidValues = ['null', '[1,2,3]', '42', 'true', '"answer"'];

	assert.equal(valid.ok, true);
	assert.deepEqual(valid.structured, { answer: 42 });

	for (const rawText of invalidValues) {
		const result = evaluateStructuredOutput({ mode: 'json_object' }, rawText, { id: rawText });

		assert.equal(result.ok, false);
		assert.deepEqual(result.error.validationErrors, ['Response must be a non-null JSON object.']);
		assert.equal(result.error.validationDetails[0].path, '$');
	}
});


test('structured output outcome validates JSON Schema through the focused module interface', () => {
	const {
		compileStructuredOutputSchema,
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const compiledValidator = compileStructuredOutputSchema({
		type: 'object',
		required: ['email'],
		properties: { email: { type: 'string', format: 'email' } },
	});

	const valid = evaluateStructuredOutput(
		{ mode: 'json_schema', compiledValidator },
		'{"email":"a@b.co"}',
		{ id: 'gen-1' },
	);
	const invalid = evaluateStructuredOutput({ mode: 'json_schema', compiledValidator }, '{}', {
		id: 'gen-2',
	});

	assert.equal(valid.ok, true);
	assert.deepEqual(valid.structured, { email: 'a@b.co' });
	assert.equal(invalid.ok, false);
	assert.deepEqual(invalid.error.validationErrors, ['$ is missing required property "email".']);
	assert.equal(invalid.error.validationDetails[0].keyword, 'required');
});


test('structured output json_schema mode lets the schema decide the root type', () => {
	const {
		compileStructuredOutputSchema,
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const arrayValidator = compileStructuredOutputSchema({
		type: 'array',
		items: { type: 'number' },
	});
	const stringValidator = compileStructuredOutputSchema({ type: 'string', minLength: 3 });

	const arrayResult = evaluateStructuredOutput(
		{ mode: 'json_schema', compiledValidator: arrayValidator },
		'[1,2,3]',
		{ id: 'array' },
	);
	const stringResult = evaluateStructuredOutput(
		{ mode: 'json_schema', compiledValidator: stringValidator },
		'"abc"',
		{ id: 'string' },
	);
	const invalidString = evaluateStructuredOutput(
		{ mode: 'json_schema', compiledValidator: stringValidator },
		'{"abc":true}',
		{ id: 'object' },
	);

	assert.equal(arrayResult.ok, true);
	assert.deepEqual(arrayResult.structured, [1, 2, 3]);
	assert.equal(stringResult.ok, true);
	assert.equal(stringResult.structured, 'abc');
	assert.equal(invalidString.ok, false);
	assert.match(invalidString.error.validationErrors[0], /must be string/i);
});


test('structured parser unwraps unambiguous n8n-style wrappers only', () => {
	const {
		validateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');

	assert.deepEqual(validateStructuredOutput('json_object', '{"json":{"answer":42}}'), {
		ok: true,
		value: { answer: 42 },
	});
	assert.deepEqual(
		validateStructuredOutput('json_object', '{"json":{"structured":{"answer":42}}}'),
		{
			ok: true,
			value: { answer: 42 },
		},
	);
	assert.deepEqual(
		validateStructuredOutput('json_object', '{"json":{"answer":42},"pairedItem":0}'),
		{
			ok: true,
			value: { json: { answer: 42 }, pairedItem: 0 },
		},
	);
});


test('Openrouter LLM in json_object mode rejects array and primitive responses after exhausting retries', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 0,
		},
		{
			continueOnFail: true,
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '[1,2,3]' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.match(result[0][0].json.error, /non-null JSON object/i);
});


test('Openrouter LLM in json_schema mode rejects unparseable and uncompilable schemas before any HTTP request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const cases = [
		['{not json', /JSON Schema parse failed/i],
		[JSON.stringify({ type: 'not-a-real-type' }), /JSON Schema compile failed/i],
	];

	for (const [schema, message] of cases) {
		const execution = createExecutionContext(
			{
				model: 'openai/gpt-4o-mini',
				prompt: 'Hello',
				generation: { temperature: 0.2, maxTokens: 100 },
				outputMode: 'json_schema',
				jsonSchema: schema,
			},
			{ continueOnFail: true },
		);

		const result = await node.execute.call(execution.context);

		assert.equal(execution.requests.length, 0);
		assert.match(result[0][0].json.error, message);
	}
});


test('Openrouter LLM in json_schema mode sends strict json_schema response_format and returns parsed structured payload', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		required: ['email'],
		properties: { email: { type: 'string', format: 'email' } },
	};
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [
					{
						message: {
							role: 'assistant',
							content: '{"email":"a@b.co"}',
						},
					},
				],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.deepEqual(requests[0].body.response_format, {
		type: 'json_schema',
		json_schema: { name: 'response', schema, strict: true },
	});
	assert.deepEqual(result[0][0].json.structured, { email: 'a@b.co' });
});


test('Openrouter LLM accepts OpenAI-style json_schema wrappers without validating against the wrapper itself', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		required: ['project'],
		properties: { project: { type: 'object' } },
		additionalProperties: false,
	};
	const jsonSchema = { name: 'project_report', strict: true, schema };
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(jsonSchema),
			maxValidationAttempts: 0,
		},
		{
			continueOnFail: true,
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '[  ]' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.deepEqual(requests[0].body.response_format, {
		type: 'json_schema',
		json_schema: jsonSchema,
	});
	assert.match(result[0][0].json.error, /must be object/i);
});


test('Openrouter LLM in json_schema mode allows array roots when schema allows arrays', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = { type: 'array', items: { type: 'number' } };
	const { context } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '[1,2,3]' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.deepEqual(result[0][0].json.structured, [1, 2, 3]);
});


test('Openrouter LLM validates without inserting defaults or removing additional properties', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		properties: { answer: { type: 'number', default: 42 } },
		additionalProperties: false,
	};
	const { context } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
		},
		{
			continueOnFail: true,
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '{"extra":true}' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.match(result[0][0].json.error, /unsupported property "extra"/i);
	assert.deepEqual(result[0][0].json.structuredOutputValidationErrors, [
		'$ includes unsupported property "extra".',
	]);
	assert.equal(
		result[0][0].json.structuredOutputValidationDetails[0].keyword,
		'additionalProperties',
	);
	assert.equal(result[0][0].json.structuredOutputOriginalText, '{"extra":true}');
});


test('structured schema validation messages name missing fields and keep technical details', () => {
	const {
		compileStructuredOutputSchema,
		validateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const validator = compileStructuredOutputSchema({
		type: 'object',
		required: ['email'],
		properties: { email: { type: 'string', format: 'email' } },
	});

	const result = validateStructuredOutput('json_schema', '{}', validator);

	assert.equal(result.ok, false);
	assert.deepEqual(result.errors, ['$ is missing required property "email".']);
	assert.equal(result.details[0].keyword, 'required');
	assert.equal(result.details[0].params.missingProperty, 'email');
});


test('Openrouter LLM in text output mode omits response_format and returns structured null', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	const result = await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'response_format'), false);
	assert.equal(result[0][0].json.structured, null);
});
