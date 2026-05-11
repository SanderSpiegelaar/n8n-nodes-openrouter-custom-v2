const assert = require('node:assert/strict');
const { test } = require('node:test');

const packageJson = require('../package.json');

function createExecutionContext(parameters, overrides = {}) {
	const requests = [];
	const inputItems = overrides.inputItems ?? [{ json: { prompt: 'Summarize the status' } }];
	const responder = overrides.responder ?? (() => ({
		id: 'gen-1',
		choices: [{ message: { role: 'assistant', content: 'Done' } }],
	}));

	return {
		requests,
		context: {
			getInputData: () => inputItems,
			getNodeParameter: (name, _itemIndex, defaultValue) => {
				if (Object.prototype.hasOwnProperty.call(parameters, name)) {
					return parameters[name];
				}

				return defaultValue;
			},
			getNode: () => ({ name: 'Openrouter LLM', type: 'openrouterLlm' }),
			getExecutionId: () => overrides.executionId ?? 'exec-1',
			getWorkflow: () => ({
				id: overrides.workflowId ?? 'workflow-1',
				name: overrides.workflowName ?? 'Workflow One',
			}),
			getCredentials: async () => ({ baseUrl: 'https://openrouter.ai/api/v1' }),
			continueOnFail: () => overrides.continueOnFail ?? false,
			helpers: {
				httpRequestWithAuthentication: async (_credentialType, requestOptions) => {
					const snapshot = JSON.parse(JSON.stringify(requestOptions));
					requests.push(snapshot);
					return responder(requestOptions, requests.length - 1);
				},
			},
		},
	};
}

test('package wiring points at Openrouter LLM node and OpenRouter API credential', () => {
	assert.deepEqual(packageJson.n8n.nodes, ['dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js']);
	assert.deepEqual(packageJson.n8n.credentials, [
		'dist/credentials/OpenRouterApi.credentials.js',
	]);
});

test('OpenRouter custom credential uses a non-conflicting type and exposes secure API key and attribution fields', () => {
	const { OpenRouterApi } = require('../dist/credentials/OpenRouterApi.credentials.js');
	const credential = new OpenRouterApi();

	assert.equal(credential.name, 'openRouterCustomV2Api');
	assert.equal(credential.displayName, 'OpenRouter Custom V2 API');

	const propertiesByName = Object.fromEntries(
		credential.properties.map((property) => [property.name, property]),
	);

	assert.equal(propertiesByName.apiKey.typeOptions.password, true);
	assert.equal(propertiesByName.baseUrl.default, 'https://openrouter.ai/api/v1');
	assert.ok(propertiesByName.siteUrl);
	assert.ok(propertiesByName.appName);
});

test('Openrouter LLM requires the package-specific OpenRouter credential type', () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();

	assert.deepEqual(node.description.credentials, [
		{
			name: 'openRouterCustomV2Api',
			required: true,
		},
	]);
});

test('Openrouter LLM posts one chat completion request per input item', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		promptMode: 'systemUser',
		prompt: '={{$json.prompt}}',
		systemMessage: 'Be concise',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	const result = await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.equal(requests[0].method, 'POST');
	assert.equal(requests[0].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[0].url, '/chat/completions');
	assert.deepEqual(requests[0].body, {
		model: 'openai/gpt-4o-mini',
		messages: [
			{ role: 'system', content: 'Be concise' },
			{ role: 'user', content: '={{$json.prompt}}' },
		],
		metadata: {
			execution_id: 'exec-1',
			workflow_id: 'workflow-1',
			workflow_name: 'Workflow One',
			node_name: 'Openrouter LLM',
			item_index: 0,
			model: 'openai/gpt-4o-mini',
			validation_attempt: 1,
		},
		temperature: 0.2,
		max_tokens: 100,
	});
	assert.equal(result[0][0].json.text, 'Done');
	assert.equal(result[0][0].json.response.id, 'gen-1');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
});

test('Openrouter LLM supports single prompt mode', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		promptMode: 'single',
		singlePrompt: 'Tell me one useful fact',
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.messages, [
		{ role: 'user', content: 'Tell me one useful fact' },
	]);
});

test('Openrouter LLM supports messages JSON mode from a JSON string', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		promptMode: 'messagesJson',
		messagesJson: JSON.stringify([
			{ role: 'system', content: 'Answer tersely' },
			{ role: 'user', content: 'What changed?' },
			{ role: 'assistant', content: 'The node changed.' },
			{ role: 'user', content: 'Summarize it.' },
		]),
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.messages, [
		{ role: 'system', content: 'Answer tersely' },
		{ role: 'user', content: 'What changed?' },
		{ role: 'assistant', content: 'The node changed.' },
		{ role: 'user', content: 'Summarize it.' },
	]);
});

test('Openrouter LLM supports messages JSON mode from an array value', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		promptMode: 'messagesJson',
		messagesJson: [
			{ role: 'system', content: 'Answer tersely' },
			{ role: 'user', content: 'What changed?' },
		],
		generation: { temperature: 0.2, maxTokens: 100 },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.messages, [
		{ role: 'system', content: 'Answer tersely' },
		{ role: 'user', content: 'What changed?' },
	]);
});

test('Openrouter LLM rejects invalid prompt messages before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			promptMode: 'messagesJson',
			messagesJson: [{ role: 'tool', content: 'bad' }],
			generation: { temperature: 0.2, maxTokens: 100 },
		},
		{ continueOnFail: true },
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 0);
	assert.match(result[0][0].json.error, /message 1 role must be one of system, user, assistant/i);
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
});

test('Openrouter LLM rejects empty prompts and message content before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const emptyPrompt = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: '   ',
			systemMessage: 'Be concise',
			generation: { temperature: 0.2, maxTokens: 100 },
		},
		{ continueOnFail: true },
	);
	const emptyMessages = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			promptMode: 'messagesJson',
			messagesJson: [],
			generation: { temperature: 0.2, maxTokens: 100 },
		},
		{ continueOnFail: true },
	);
	const emptyMessageContent = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			promptMode: 'messagesJson',
			messagesJson: [{ role: 'user', content: '' }],
			generation: { temperature: 0.2, maxTokens: 100 },
		},
		{ continueOnFail: true },
	);

	const emptyPromptResult = await node.execute.call(emptyPrompt.context);
	const emptyMessagesResult = await node.execute.call(emptyMessages.context);
	const emptyMessageContentResult = await node.execute.call(emptyMessageContent.context);

	assert.equal(emptyPrompt.requests.length, 0);
	assert.equal(emptyMessages.requests.length, 0);
	assert.equal(emptyMessageContent.requests.length, 0);
	assert.match(emptyPromptResult[0][0].json.error, /user prompt must not be empty/i);
	assert.match(emptyMessagesResult[0][0].json.error, /must contain at least one message/i);
	assert.match(emptyMessageContentResult[0][0].json.error, /message 1 content must not be empty/i);
});

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

test('Openrouter LLM loads searchable text model options from OpenRouter', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const requests = [];
	const context = {
		getCredentials: async () => ({ baseUrl: 'https://openrouter.ai/api/v1' }),
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, requestOptions) => {
				requests.push(requestOptions);
				return {
					data: [
						{
							id: 'openai/gpt-4o-mini',
							name: 'GPT-4o Mini',
							architecture: { output_modalities: ['text'] },
						},
						{
							id: 'image/model',
							name: 'Image Model',
							architecture: { output_modalities: ['image'] },
						},
						{
							id: 'openrouter/auto',
							name: 'Auto Router',
							architecture: { output_modalities: ['text'] },
						},
					],
				};
			},
		},
	};

	const result = await node.methods.listSearch.getOpenRouterModels.call(context, 'gpt');

	assert.equal(requests[0].method, 'GET');
	assert.equal(requests[0].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[0].url, '/models');
	assert.deepEqual(result.results, [{ name: 'openai/gpt-4o-mini', value: 'openai/gpt-4o-mini' }]);
});

test('Openrouter LLM maps typed generation and advanced sampling controls', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: {
			temperature: 0.2,
			maxTokens: 250,
			topP: 0.9,
			frequencyPenalty: 0.1,
			presencePenalty: 0.2,
			stop: 'END',
			seed: 42,
			promptCacheKey: 'workflow-cache',
		},
		advancedSampling: {
			topK: 50,
			repetitionPenalty: 1.1,
			minP: 0.05,
			topA: 0.2,
			transforms: ['middle-out'],
		},
		integrations: { responseHealing: true, sessionId: 'session-1' },
	});

	await node.execute.call(context);

	assert.equal(requests[0].body.max_tokens, 250);
	assert.equal(requests[0].body.top_p, 0.9);
	assert.equal(requests[0].body.frequency_penalty, 0.1);
	assert.equal(requests[0].body.presence_penalty, 0.2);
	assert.equal(requests[0].body.stop, 'END');
	assert.equal(requests[0].body.seed, 42);
	assert.equal(requests[0].body.prompt_cache_key, 'workflow-cache');
	assert.equal(requests[0].body.top_k, 50);
	assert.equal(requests[0].body.repetition_penalty, 1.1);
	assert.equal(requests[0].body.min_p, 0.05);
	assert.equal(requests[0].body.top_a, 0.2);
	assert.deepEqual(requests[0].body.transforms, ['middle-out']);
	assert.deepEqual(requests[0].body.plugins, [{ id: 'response-healing' }]);
	assert.equal(requests[0].body.session_id, 'session-1');
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'user'), false);
});

test('Openrouter LLM strips empty optional controls from the request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: {
			temperature: 0.2,
			maxTokens: '',
			topP: '',
			frequencyPenalty: '',
			presencePenalty: '',
			stop: '',
			seed: '',
			promptCacheKey: '',
		},
		reasoning: { mode: 'off', effort: 'high', maxTokens: 100, exclude: false },
		advancedSampling: {
			topK: '',
			repetitionPenalty: '',
			minP: '',
			topA: '',
			transforms: [],
		},
		integrations: { responseHealing: false, sessionId: '' },
	});

	await node.execute.call(context);

	for (const field of [
		'max_tokens',
		'top_p',
		'frequency_penalty',
		'presence_penalty',
		'stop',
		'seed',
		'prompt_cache_key',
		'reasoning',
		'top_k',
		'repetition_penalty',
		'min_p',
		'top_a',
		'transforms',
		'plugins',
		'session_id',
	]) {
		assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, field), false, field);
	}
});

test('Openrouter LLM maps reasoning modes without mixing effort and token budget', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const effort = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2 },
		reasoning: { mode: 'effort', effort: 'xhigh', maxTokens: 100, exclude: true },
	});
	const tokenBudget = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2 },
		reasoning: { mode: 'tokenBudget', effort: 'low', maxTokens: 512, exclude: true },
	});
	const defaultEnabled = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2 },
		reasoning: { mode: 'defaultEnabled', effort: 'low', maxTokens: 512, exclude: false },
	});

	await node.execute.call(effort.context);
	await node.execute.call(tokenBudget.context);
	await node.execute.call(defaultEnabled.context);

	assert.deepEqual(effort.requests[0].body.reasoning, { effort: 'xhigh', exclude: true });
	assert.equal(Object.prototype.hasOwnProperty.call(effort.requests[0].body.reasoning, 'max_tokens'), false);
	assert.deepEqual(tokenBudget.requests[0].body.reasoning, { max_tokens: 512, exclude: true });
	assert.equal(Object.prototype.hasOwnProperty.call(tokenBudget.requests[0].body.reasoning, 'effort'), false);
	assert.deepEqual(defaultEnabled.requests[0].body.reasoning, {});
});

test('Openrouter LLM validates numeric typed controls before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const invalidCases = [
		[{ generation: { maxTokens: -1 } }, /max tokens must be greater than 0/i],
		[{ reasoning: { mode: 'tokenBudget', maxTokens: 0 } }, /reasoning max tokens must be greater than 0/i],
		[{ advancedSampling: { topK: 0 } }, /top k must be greater than 0/i],
		[{ advancedSampling: { repetitionPenalty: 0 } }, /repetition penalty must be greater than 0/i],
		[{ advancedSampling: { minP: -0.1 } }, /min p must be between 0 and 1/i],
		[{ advancedSampling: { topA: 1.1 } }, /top a must be between 0 and 1/i],
	];

	for (const [parameters, message] of invalidCases) {
		const execution = createExecutionContext(
			{
				model: 'openai/gpt-4o-mini',
				prompt: 'Hello',
				generation: { temperature: 0.2 },
				...parameters,
			},
			{ continueOnFail: true },
		);

		const result = await node.execute.call(execution.context);

		assert.equal(execution.requests.length, 0);
		assert.match(result[0][0].json.error, message);
	}
});

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
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body.metadata, 'X-Customer-Trace'), false);
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

	assert.deepEqual(requests[0].headers, {});
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
		[
			{ values: [{ key: 'payload', valueMode: 'json', value: '{bad' }] },
			/payload.*valid JSON/i,
		],
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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');

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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
	const response = { id: 'gen-1', choices: [{ message: { content: '{"answer":42}' } }] };

	const result = evaluateStructuredOutput(
		{ mode: 'json_object' },
		'{"answer":42}',
		response,
	);

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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');

	const result = evaluateStructuredOutput(
		{ mode: 'json_object' },
		'[1,2,3]',
		{ id: 'gen-1' },
	);

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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');

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

test('structured output repair loop uses a callback seam and returns repaired success metadata', async () => {
	const {
		evaluateStructuredOutputWithRepair,
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
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

test('structured output outcome validates JSON Schema through the focused module interface', () => {
	const {
		compileStructuredOutputSchema,
		evaluateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
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
	const invalid = evaluateStructuredOutput(
		{ mode: 'json_schema', compiledValidator },
		'{}',
		{ id: 'gen-2' },
	);

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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
	const arrayValidator = compileStructuredOutputSchema({ type: 'array', items: { type: 'number' } });
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
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');

	assert.deepEqual(validateStructuredOutput('json_object', '{"json":{"answer":42}}'), {
		ok: true,
		value: { answer: 42 },
	});
	assert.deepEqual(validateStructuredOutput('json_object', '{"json":{"structured":{"answer":42}}}'), {
		ok: true,
		value: { answer: 42 },
	});
	assert.deepEqual(validateStructuredOutput('json_object', '{"json":{"answer":42},"pairedItem":0}'), {
		ok: true,
		value: { json: { answer: 42 }, pairedItem: 0 },
	});
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
	assert.equal(result[0][0].json.structuredOutputValidationDetails[0].keyword, 'additionalProperties');
	assert.equal(result[0][0].json.structuredOutputOriginalText, '{"extra":true}');
});

test('structured schema validation messages name missing fields and keep technical details', () => {
	const {
		compileStructuredOutputSchema,
		validateStructuredOutput,
	} = require('../dist/nodes/OpenrouterLlm/StructuredOutputParser.js');
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
	assert.deepEqual(result[0][0].json.structured, { answer: 7 });
	assert.equal(result[0][0].json.text, '{"answer":7}');
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
	assert.match(result[0][0].json.error, /Repair Prompt Template is missing required placeholder \{instructions\}/i);
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
	assert.deepEqual(result[0][0].json.structured, { answer: 7 });
	assert.equal(result[0][0].json.text, '{"answer":7}');
	assert.deepEqual(result[0][0].json.structuredOutputRepair, {
		repaired: true,
		repairAttempts: 1,
	});
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
	assert.deepEqual(result[0][0].json.structured, { answer: 7 });
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

test('Exclude reasoning with mode off still sends reasoning.exclude to the API', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context, requests } = createExecutionContext({
		model: 'openai/gpt-4o-mini',
		prompt: 'Hello',
		generation: { temperature: 0.2 },
		reasoning: { mode: 'off', exclude: true },
	});

	await node.execute.call(context);

	assert.deepEqual(requests[0].body.reasoning, { exclude: true });
});

test('Exclude reasoning strips reasoning fields from response output', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const { context } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			prompt: 'Hello',
			generation: { temperature: 0.2 },
			reasoning: { mode: 'effort', effort: 'medium', exclude: true },
		},
		{
			responder: () => ({
				id: 'gen-1',
				choices: [
					{
						message: {
							role: 'assistant',
							content: 'The answer is 42.',
							reasoning: 'Let me think step by step...',
							reasoning_content: 'Internal reasoning trace',
						},
					},
				],
			}),
		},
	);

	const result = await node.execute.call(context);
	const responseChoices = result[0][0].json.response.choices;

	assert.equal(responseChoices[0].message.content, 'The answer is 42.');
	assert.equal(responseChoices[0].message.reasoning, undefined);
	assert.equal(responseChoices[0].message.reasoning_content, undefined);
});
