const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/openrouter-test-context.js');

test('Openrouter LLM omits the plugins key entirely when the web search plugin is disabled and response healing is off', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: false },
	});

	await node.execute.call(context);

	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'plugins'), false);
});


test('Openrouter LLM sends a bare web plugin when enabled with no optional fields set', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: true },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.plugins, [{ id: 'web' }]);
});


test('Openrouter LLM forwards web plugin max_results when set', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: true, webMaxResults: 5 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.plugins, [{ id: 'web', max_results: 5 }]);
});


test('Openrouter LLM forwards web plugin search_prompt when set to a non-empty string', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: true, webSearchPrompt: 'Cite primary sources in your answer.' },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.plugins, [
		{ id: 'web', search_prompt: 'Cite primary sources in your answer.' },
	]);
});


test('Openrouter LLM rejects the :online variant combined with the web search plugin before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			modelOptions: { modelVariant: ':online' },
			prompt: 'Hello',
			generation: { temperature: 0.2, maxTokens: 100 },
			integrations: { webEnabled: true },
		},
		{ continueOnFail: true },
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 0);
	assert.match(result[0][0].json.error, /online/i);
	assert.match(result[0][0].json.error, /web/i);
});


test('Openrouter LLM allows nitro variant combined with the web search plugin', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		modelOptions: { modelVariant: ':nitro' },
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: true },
	});

	await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.deepEqual(requests[0].body.plugins, [{ id: 'web' }]);
	assert.equal(requests[0].body.model, 'openai/gpt-4o-mini:nitro');
});


test('Openrouter LLM allows the :online variant when the web search plugin is disabled', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		modelOptions: { modelVariant: ':online' },
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { webEnabled: false },
	});

	await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.equal(requests[0].body.model, 'openai/gpt-4o-mini:online');
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'plugins'), false);
});


test('Openrouter LLM combines response-healing and web plugins in a single plugins array', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2, maxTokens: 100 },
		integrations: { responseHealing: true, webEnabled: true, webMaxResults: 3 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.plugins, [
		{ id: 'response-healing' },
		{ id: 'web', max_results: 3 },
	]);
});

