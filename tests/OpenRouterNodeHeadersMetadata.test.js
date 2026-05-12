const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/OpenRouterTestContext.js');

test('Openrouter LLM sends Langfuse trace headers and body metadata without crossing surfaces', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			integrations: {
				langfuseTrace: true,
				headers: {
					values: [{ name: 'X-Customer-Trace', value: 'trace-{{$json.id}}' }],
				},
				metadata: {
					values: [
						{ key: 'tenant', valueMode: 'string', value: 'acme' },
						{ key: 'payload', valueMode: 'json', value: '{"ok":true}' },
					],
				},
			},
		},
		{
			inputItems: [{ json: { id: 'one' } }],
			executionId: 'exec-123',
			workflowId: 'wf-123',
			workflowName: 'Production Workflow',
		},
	);

	await node.execute.call(context);

	assert.deepEqual(requests[0].headers, {
		Authorization: 'Bearer test-openrouter-api-key',
		'HTTP-Referer': '',
		'X-OpenRouter-Title': '',
		'langfuse-trace-id': 'exec-123',
		'X-Customer-Trace': 'trace-{{$json.id}}',
	});
	assert.deepEqual(requests[0].body.metadata, {
		execution_id: 'exec-123',
		workflow_id: 'wf-123',
		workflow_name: 'Production Workflow',
		node_name: 'Openrouter LLM',
		item_index: 0,
		model: 'openai/gpt-4o-mini',
		validation_attempt: 1,
		tenant: 'acme',
		payload: { ok: true },
	});
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].headers, 'tenant'), false);
	assert.equal(
		Object.prototype.hasOwnProperty.call(requests[0].body.metadata, 'X-Customer-Trace'),
		false,
	);
});


test('Openrouter LLM can disable the Langfuse trace header', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { langfuseTrace: false },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].headers, {
		Authorization: 'Bearer test-openrouter-api-key',
		'HTTP-Referer': '',
		'X-OpenRouter-Title': '',
	});
	assert.equal(requests[0].body.metadata.execution_id, 'exec-1');
});


test('Openrouter LLM rejects protected custom headers before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const protectedHeaders = ['Authorization', 'http-referer', 'X-Title'];

	for (const headerName of protectedHeaders) {
		const execution = createExecutionContext(
			{
				model: 'openai/gpt-4o-mini',
				prompt: 'Hello',
				generation: { temperature: 0.2, maxTokens: 100 },
				integrations: { headers: { values: [{ name: headerName, value: 'bad' }] } },
			},
			{ continueOnFail: true },
		);

		const result = await node.execute.call(execution.context);

		assert.equal(execution.requests.length, 0);
		assert.match(result[0][0].json.error, new RegExp(`${headerName}.*protected`, 'i'));
	}
});


test('Openrouter LLM rejects invalid metadata rows before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const invalidCases = [
		[{ values: [{ key: 'payload', valueMode: 'json', value: '{bad' }] }, /payload.*valid JSON/i],
		[
			{ values: [{ key: 'execution_id', valueMode: 'string', value: 'override' }] },
			/execution_id.*default metadata/i,
		],
	];

	for (const [metadata, message] of invalidCases) {
		const execution = createExecutionContext(
			{
				model: 'openai/gpt-4o-mini',
				prompt: 'Hello',
				generation: { temperature: 0.2, maxTokens: 100 },
				integrations: { metadata },
			},
			{ continueOnFail: true },
		);

		const result = await node.execute.call(execution.context);

		assert.equal(execution.requests.length, 0);
		assert.match(result[0][0].json.error, message);
	}
});


test('Openrouter LLM builds metadata per input item', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
		},
		{ inputItems: [{ json: { id: 1 } }, { json: { id: 2 } }] },
	);

	await node.execute.call(context);

	assert.equal(requests.length, 2);
	assert.equal(requests[0].body.metadata.item_index, 0);
	assert.equal(requests[1].body.metadata.item_index, 1);
});


test('Openrouter LLM keeps custom headers byte-identical across all retry attempts of one item', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const responses = ['nope', 'still bad', '{"ok":true}'];
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 3,
			integrations: { headers: { values: [{ name: 'X-Trace', value: 'abc' }] } },
		},
		{
			responder: (_opts, attemptIndex) => ({
				id: `gen-${attemptIndex + 1}`,
				choices: [{ message: { role: 'assistant', content: responses[attemptIndex] } }],
			}),
		},
	);

	await node.execute.call(context);

	assert.equal(requests.length, 3);
	assert.deepEqual(requests[0].headers, requests[1].headers);
	assert.deepEqual(requests[1].headers, requests[2].headers);
});

