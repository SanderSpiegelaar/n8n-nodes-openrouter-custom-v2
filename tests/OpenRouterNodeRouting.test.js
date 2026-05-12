const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/OpenRouterTestContext.js');

test('Openrouter LLM appends selected primary model variants after normalizing suffixes', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'anthropic/claude-3.5-sonnet:free',
		modelOptions: { modelVariant: ':nitro' },
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.equal(requests[0].body.model, 'anthropic/claude-3.5-sonnet:nitro');
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'models'), false);
});


test('Openrouter LLM sends fallback chains with models and no model field', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: { mode: 'list', value: 'openai/gpt-4o-mini' },
		modelOptions: {
			modelVariant: ':exacto',
			fallbackModels: {
				values: [{ model: 'anthropic/claude-3-haiku' }, { model: 'google/gemini-flash-1.5' }],
			},
		},
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.models, [
		'openai/gpt-4o-mini:exacto',
		'anthropic/claude-3-haiku',
		'google/gemini-flash-1.5',
	]);
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'model'), false);
});


test('Openrouter LLM omits the provider key entirely when no provider routing is configured', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'provider'), false);
});


test('Openrouter LLM maps allow and deny provider lists to provider.only and provider.ignore', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		providerRouting: {
			allow: {
				values: [{ name: 'anthropic' }, { name: '' }, { name: 'openai' }],
			},
			deny: {
				values: [{ name: 'fireworks' }, { name: '   ' }],
			},
		},
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.provider, {
		only: ['anthropic', 'openai'],
		ignore: ['fireworks'],
	});
});


test('Openrouter LLM maps provider sort, allow_fallbacks, and require_parameters when set', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		providerRouting: {
			sort: 'price',
			allowFallbacks: 'false',
			requireParameters: 'true',
		},
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.provider, {
		sort: 'price',
		allow_fallbacks: false,
		require_parameters: true,
	});
});


test('Openrouter LLM omits provider three-state fields by default', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		providerRouting: {
			sort: '',
			allowFallbacks: '',
			requireParameters: '',
		},
	});

	await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'provider'), false);
});


test('Openrouter LLM rejects nitro variant combined with provider sort before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			modelOptions: { modelVariant: ':nitro' },
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			providerRouting: { sort: 'throughput' },
		},
		{ continueOnFail: true },
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 0);
	assert.match(result[0][0].json.error, /nitro/i);
	assert.match(result[0][0].json.error, /provider sort/i);
});


test('Openrouter LLM rejects floor variant combined with provider sort before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			modelOptions: { modelVariant: ':floor' },
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			providerRouting: { sort: 'price' },
		},
		{ continueOnFail: true },
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 0);
	assert.match(result[0][0].json.error, /floor/i);
	assert.match(result[0][0].json.error, /provider sort/i);
});


test('Openrouter LLM rejects providers appearing in both allow and deny lists case-insensitively', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			providerRouting: {
				allow: { values: [{ name: '  Anthropic ' }] },
				deny: { values: [{ name: 'anthropic' }] },
			},
		},
		{ continueOnFail: true },
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 0);
	assert.match(result[0][0].json.error, /anthropic/i);
});


test('Openrouter LLM does not force provider.require_parameters in json_object mode', async () => {
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
				choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
			}),
		},
	);

	await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'provider'), false);
});


test('Openrouter LLM defaults provider.require_parameters to true in json_schema mode when override is Default', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const schema = {
		type: 'object',
		required: ['ok'],
		properties: { ok: { type: 'boolean' } },
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
				choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
			}),
		},
	);

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.provider, { require_parameters: true });
});


test('Openrouter LLM honors explicit Require Parameters override over the structured-mode default', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			outputMode: 'json_object',
			providerRouting: { requireParameters: 'false' },
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
			}),
		},
	);

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.provider, { require_parameters: false });
});


test('Openrouter LLM in text mode does not auto-set provider.require_parameters', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'provider'), false);
});


test('Openrouter LLM allows exacto variant combined with allow and deny provider lists', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		modelOptions: { modelVariant: ':exacto' },
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		providerRouting: {
			allow: { values: [{ name: 'anthropic' }] },
			deny: { values: [{ name: 'fireworks' }] },
		},
	});

	await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.deepEqual(requests[0].body.provider, {
		only: ['anthropic'],
		ignore: ['fireworks'],
	});
	assert.equal(requests[0].body.model, 'openai/gpt-4o-mini:exacto');
});

