const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/openrouter-test-context.js');

test('structured output repair loop uses a callback seam and returns repaired success metadata', async () => {
	const {
		evaluateStructuredOutputWithRepair,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const requestBodies = [];
	const result = await evaluateStructuredOutputWithRepair(
		{
			mode: 'json_object',
			repair: {
				maxAttempts: 1,
				metadata: (attempt, model) => ({ validation_attempt: attempt, model }),
				send: async (body) => {
					requestBodies.push(body);
					return {
						response: { id: 'repair-1' },
						text: '{"json":{"answer":7}}',
					};
				},
			},
		},
		'not json',
		{ id: 'gen-1' },
	);

	assert.equal(requestBodies.length, 1);
	assert.deepEqual(requestBodies[0].response_format, { type: 'json_object' });
	assert.deepEqual(requestBodies[0].metadata, {
		validation_attempt: 2,
		model: 'openai/gpt-oss-120b:nitro',
	});
	assert.equal(result.ok, true);
	assert.deepEqual(result.structured, { answer: 7 });
	assert.equal(result.text, '{"answer":7}');
	assert.deepEqual(result.response, { id: 'repair-1' });
	assert.deepEqual(result.repair, {
		repaired: true,
		repairAttempts: 1,
		latestRepairText: '{"json":{"answer":7}}',
	});
});


test('structured output repair loop returns exhausted failure data with latest repair text', async () => {
	const {
		evaluateStructuredOutputWithRepair,
	} = require('../dist/nodes/OpenrouterLlm/structured-output/StructuredOutputParser.js');
	const result = await evaluateStructuredOutputWithRepair(
		{
			mode: 'json_object',
			repair: {
				maxAttempts: 2,
				send: async () => ({ response: { id: 'repair' }, text: '[1,2,3]' }),
			},
		},
		'not json',
		{ id: 'gen-1' },
	);

	assert.equal(result.ok, false);
	assert.equal(result.error.originalRawText, 'not json');
	assert.equal(result.error.repair.latestRepairText, '[1,2,3]');
	assert.equal(result.error.repair.repairAttempts, 2);
	assert.match(result.error.validationErrors[0], /non-null JSON object/i);
	assert.equal(result.error.validationDetails[0].path, '$');
});


test('Openrouter LLM Continue On Fail returns structured-output diagnostics after repair attempts fail', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['{"extra":true}', '{"stillExtra":true}'];
	const schema = {
		type: 'object',
		required: ['answer'],
		properties: { answer: { type: 'number' } },
		additionalProperties: false,
	};
	const { context } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
			maxValidationAttempts: 1,
		},
		{
			continueOnFail: true,
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.match(result[0][0].json.error, /missing required property "answer"/i);
	assert.deepEqual(result[0][0].json.structuredOutputOriginalText, responses[0]);
	assert.deepEqual(result[0][0].json.structuredOutputLatestRepairText, responses[1]);
	assert.ok(result[0][0].json.structuredOutputValidationErrors.length >= 1);
	assert.equal(result[0][0].json.structuredOutputValidationDetails[0].keyword, 'required');
});


test('Openrouter LLM throws readable structured-output diagnostics when Continue On Fail is disabled', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		required: ['answer'],
		properties: { answer: { type: 'number' } },
	};
	const { context } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
			maxValidationAttempts: 1,
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '{}' } }],
			}),
		},
	);

	await assert.rejects(
		() => node.execute.call(context),
		(error) => {
			assert.match(error.message, /missing required property "answer"/i);
			assert.match(error.description, /validationDetails/);
			assert.match(error.description, /originalOutputText/);
			return true;
		},
	);
});


test('Openrouter LLM sends repair defaults on the second structured-output request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['not json at all', '{"json":{"answer":7}}'];
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.8, maxTokens: 100 },
			outputMode: 'json_object',
			outputOptions: { includeResponseDetails: true },
			maxValidationAttempts: 1,
		},
		{
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 2);
	assert.equal(requests[1].body.model, 'openai/gpt-oss-120b:nitro');
	assert.equal(requests[1].body.temperature, 0.1);
	assert.deepEqual(requests[1].body.reasoning, { effort: 'none' });
	assert.match(requests[1].body.messages[0].content, /not json at all/);
	assert.match(requests[1].body.messages[0].content, /Validation error/i);
	assert.deepEqual(result[0][0].json.output, { answer: 7 });
	assert.equal(result[0][0].json.response.id, 'gen-2');
	assert.deepEqual(result[0][0].json.structuredOutputRepair, {
		repaired: true,
		repairAttempts: 1,
	});
});


test('Openrouter LLM validates custom repair prompts before making a repair request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			outputMode: 'json_object',
			maxValidationAttempts: 1,
			repair: { promptTemplate: 'Fix {completion} using {error}' },
		},
		{
			continueOnFail: true,
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: 'not json' } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.match(
		result[0][0].json.error,
		/Repair Prompt Template is missing required placeholder \{instructions\}/i,
	);
});


test('Openrouter LLM repairs invalid json_schema output with a JSON Object repair request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['{"extra":true}', '{"answer":7}'];
	const schema = {
		type: 'object',
		required: ['answer'],
		properties: { answer: { type: 'number' } },
		additionalProperties: false,
	};
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
			maxValidationAttempts: 1,
		},
		{
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 2);
	assert.deepEqual(requests[0].body.response_format, {
		type: 'json_schema',
		json_schema: { name: 'response', schema, strict: true },
	});
	assert.deepEqual(requests[1].body.response_format, { type: 'json_object' });
	assert.deepEqual(result[0][0].json, { output: { answer: 7 } });
});


test('Openrouter LLM retries once with a corrective system message and succeeds on the second attempt', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['not json at all', '{"answer":7}'];
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 3,
		},
		{
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 2);
	assert.equal(requests[0].body.metadata.validation_attempt, 1);
	assert.equal(requests[1].body.metadata.validation_attempt, 2);
	assert.equal(requests[0].body.messages.length, 1);
	assert.equal(requests[1].body.messages.length, 1);
	assert.equal(requests[1].body.messages[0].role, 'user');
	assert.match(requests[1].body.messages[0].content, /Validation error/i);
	assert.match(requests[1].body.messages[0].content, /Return only the corrected JSON/i);
	assert.deepEqual(result[0][0].json, { output: { answer: 7 } });
});


test('Openrouter LLM surfaces a final error after exhausting all validation attempts with last-attempt errors and truncated raw text', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const longRaw = `${'x'.repeat(2100)}`;
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 3,
		},
		{
			continueOnFail: true,
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: longRaw } }],
			}),
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 4);
	assert.equal(requests[3].body.metadata.validation_attempt, 4);
	assert.match(result[0][0].json.error, /after 4 attempts/i);
	assert.match(result[0][0].json.error, /\.\.\.\[truncated\]/);
});


test('Openrouter LLM does not retry on HTTP errors during structured mode', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 3,
		},
		{
			continueOnFail: true,
			responder: () => {
				throw new Error('Upstream 503');
			},
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.match(result[0][0].json.error, /Upstream 503/);
});


test('Openrouter LLM resets validation_attempt to 1 across input items even after retries', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['nope', '{"a":1}', '{"a":2}'];
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 3,
		},
		{
			inputItems: [{ json: { id: 1 } }, { json: { id: 2 } }],
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	await node.execute.call(context);

	assert.equal(requests.length, 3);
	assert.equal(requests[0].body.metadata.validation_attempt, 1);
	assert.equal(requests[1].body.metadata.validation_attempt, 2);
	assert.equal(requests[2].body.metadata.validation_attempt, 1);
	assert.equal(requests[2].body.metadata.item_index, 1);
});


test('Openrouter LLM caps the corrective system message to the first five validation errors', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		required: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
		properties: {
			a: { type: 'string' },
			b: { type: 'string' },
			c: { type: 'string' },
			d: { type: 'string' },
			e: { type: 'string' },
			f: { type: 'string' },
			g: { type: 'string' },
		},
	};
	const responses = ['{}', '{"a":"x","b":"x","c":"x","d":"x","e":"x","f":"x","g":"x"}'];
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_schema',
			jsonSchema: JSON.stringify(schema),
			maxValidationAttempts: 3,
		},
		{
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	await node.execute.call(context);

	const repairPrompt = requests[1].body.messages[0].content;
	const missingFieldMentions = repairPrompt.match(/missing required property/g) ?? [];
	assert.equal(missingFieldMentions.length, 5);
});
