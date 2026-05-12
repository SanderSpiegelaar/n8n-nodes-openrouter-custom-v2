const assert = require('node:assert/strict');
const { test } = require('node:test');

function createExecutionContext(parameters, overrides = {}) {
	const requests = [];
	const inputItems = overrides.inputItems ?? [{ json: { prompt: 'Summarize the status' } }];
	const responses = overrides.responses ?? [
		{
			id: 'gen-1',
			choices: [{ message: { role: 'assistant', content: 'Done' } }],
		},
	];

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
			getExecutionId: () => overrides.executionId ?? 'exec-boundary',
			getWorkflow: () => ({
				id: overrides.workflowId ?? 'workflow-boundary',
				name: overrides.workflowName ?? 'Boundary Workflow',
			}),
			getCredentials: async () => ({
				baseUrl: 'https://openrouter.ai/api/v1///',
				apiKey: 'test-openrouter-api-key',
			}),
			continueOnFail: () => overrides.continueOnFail ?? false,
			helpers: {
				httpRequest: async (requestOptions) => {
					requests.push(JSON.parse(JSON.stringify(requestOptions)));
					return responses[requests.length - 1] ?? responses.at(-1);
				},
				httpRequestWithAuthentication: async (_credentialType, requestOptions) => {
					requests.push(JSON.parse(JSON.stringify(requestOptions)));
					return responses[requests.length - 1] ?? responses.at(-1);
				},
			},
		},
	};
}

function loadNode() {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');

	return new OpenrouterLlm();
}

function loadExecutionModule() {
	return require('../dist/nodes/OpenrouterLlm/execution/OpenRouterExecution.js');
}

test('OpenRouter Execution public seam returns text success data and compatible request body', async () => {
	const { executeOpenRouter } = loadExecutionModule();
	const requests = [];

	const result = await executeOpenRouter({
		input: {
			modelRouting: {
				primaryModel: 'openai/gpt-4o-mini',
				fallbackModels: ['anthropic/claude-3-haiku'],
			},
			messages: [{ role: 'user', content: 'Summarize the status' }],
			outputMode: 'text',
			sampling: { temperature: 0.3, maxTokens: undefined },
			metadata: {
				defaults: {
					executionId: 'exec-boundary',
					workflowId: 'workflow-boundary',
					workflowName: 'Boundary Workflow',
					nodeName: 'Openrouter LLM',
					itemIndex: 0,
				},
				extras: { tenant: 'acme' },
			},
			provider: { only: ['openai'] },
			plugins: [{ id: 'response-healing' }],
		},
		sendChat: async (body) => {
			requests.push(JSON.parse(JSON.stringify(body)));
			return {
				response: { id: 'gen-1', choices: [{ message: { role: 'assistant', content: 'Done' } }] },
				text: 'Done',
			};
		},
	});

	assert.equal(requests.length, 1);
	assert.deepEqual(requests[0].models, ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku']);
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0], 'model'), false);
	assert.deepEqual(requests[0].messages, [{ role: 'user', content: 'Summarize the status' }]);
	assert.equal(requests[0].temperature, 0.3);
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0], 'max_tokens'), false);
	assert.deepEqual(requests[0].provider, { only: ['openai'] });
	assert.deepEqual(requests[0].plugins, [{ id: 'response-healing' }]);
	assert.equal(requests[0].metadata.model, 'openai/gpt-4o-mini');
	assert.equal(requests[0].metadata.validation_attempt, 1);
	assert.equal(requests[0].metadata.tenant, 'acme');
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0], 'response_format'), false);
	assert.deepEqual(result, {
		kind: 'success',
		data: {
			text: 'Done',
			structured: null,
			response: { id: 'gen-1', choices: [{ message: { role: 'assistant', content: 'Done' } }] },
		},
	});
});

test('OpenRouter Execution public seam validates JSON Object success data', async () => {
	const { executeOpenRouter } = loadExecutionModule();
	const requests = [];

	const result = await executeOpenRouter({
		input: {
			modelRouting: { primaryModel: 'openai/gpt-4o-mini' },
			messages: [{ role: 'user', content: 'Return JSON' }],
			outputMode: 'json_object',
			structuredOutput: { mode: 'json_object' },
		},
		sendChat: async (body) => {
			requests.push(JSON.parse(JSON.stringify(body)));
			return {
				response: { id: 'gen-1', choices: [{ message: { content: '{"ok":true}' } }] },
				text: '{"ok":true}',
			};
		},
	});

	assert.deepEqual(requests[0].response_format, { type: 'json_object' });
	assert.deepEqual(result, {
		kind: 'success',
		data: {
			text: '{"ok":true}',
			structured: { ok: true },
			response: { id: 'gen-1', choices: [{ message: { content: '{"ok":true}' } }] },
		},
	});
});

test('OpenRouter Execution public seam repairs Structured Output through the shared sender', async () => {
	const { executeOpenRouter } = loadExecutionModule();
	const requests = [];
	const responses = [
		{ response: { id: 'gen-1', choices: [{ message: { content: 'not json' } }] }, text: 'not json' },
		{
			response: { id: 'repair-1', choices: [{ message: { content: '{"json":{"ok":true}}' } }] },
			text: '{"json":{"ok":true}}',
		},
	];

	const result = await executeOpenRouter({
		input: {
			modelRouting: { primaryModel: 'openai/gpt-4o-mini' },
			messages: [{ role: 'user', content: 'Return JSON' }],
			outputMode: 'json_object',
			metadata: {
				defaults: {
					executionId: 'exec-boundary',
					workflowId: 'workflow-boundary',
					workflowName: 'Boundary Workflow',
					nodeName: 'Openrouter LLM',
					itemIndex: 0,
				},
			},
			structuredOutput: {
				mode: 'json_object',
				repair: {
					maxAttempts: 1,
					model: 'anthropic/claude-3-haiku',
					temperature: 0.2,
					reasoningEffort: 'low',
					metadata: (attempt, model) => ({ validation_attempt: attempt, model }),
				},
			},
		},
		sendChat: async (body) => {
			requests.push(JSON.parse(JSON.stringify(body)));
			return responses[requests.length - 1];
		},
	});

	assert.equal(requests.length, 2);
	assert.deepEqual(requests[0].response_format, { type: 'json_object' });
	assert.equal(requests[0].metadata.validation_attempt, 1);
	assert.equal(requests[1].model, 'anthropic/claude-3-haiku');
	assert.equal(requests[1].temperature, 0.2);
	assert.deepEqual(requests[1].reasoning, { effort: 'low' });
	assert.deepEqual(requests[1].response_format, { type: 'json_object' });
	assert.equal(requests[1].metadata.validation_attempt, 2);
	assert.equal(requests[1].metadata.model, 'anthropic/claude-3-haiku');
	assert.match(requests[1].messages[0].content, /not json/);
	assert.deepEqual(result, {
		kind: 'success',
		data: {
			text: '{"ok":true}',
			structured: { ok: true },
			response: responses[1].response,
			structuredOutputRepair: { repaired: true, repairAttempts: 1 },
		},
	});
});

test('OpenRouter Execution public seam excludes reasoning fields from final response only when requested', async () => {
	const { executeOpenRouter } = loadExecutionModule();
	const requests = [];

	const result = await executeOpenRouter({
		input: {
			modelRouting: { primaryModel: 'openai/gpt-4o-mini' },
			messages: [{ role: 'user', content: 'Think privately' }],
			outputMode: 'text',
			reasoning: {
				request: { effort: 'medium' },
				excludeFromResponse: true,
			},
		},
		sendChat: async (body) => {
			requests.push(JSON.parse(JSON.stringify(body)));
			return {
				response: {
					id: 'gen-1',
					usage: { total_tokens: 12 },
					choices: [
						{
							finish_reason: 'stop',
							message: {
								role: 'assistant',
								content: 'Done',
								reasoning: 'private chain',
								reasoning_content: 'private trace',
							},
						},
					],
				},
				text: 'Done',
			};
		},
	});

	assert.deepEqual(requests[0].reasoning, { effort: 'medium' });
	assert.equal(result.kind, 'success');
	assert.equal(result.data.response.id, 'gen-1');
	assert.deepEqual(result.data.response.usage, { total_tokens: 12 });
	assert.equal(result.data.response.choices[0].finish_reason, 'stop');
	assert.equal(result.data.response.choices[0].message.content, 'Done');
	assert.equal(result.data.response.choices[0].message.reasoning, undefined);
	assert.equal(result.data.response.choices[0].message.reasoning_content, undefined);
});

test('OpenRouter Execution public seam returns Structured Output failure data', async () => {
	const { executeOpenRouter } = loadExecutionModule();

	const result = await executeOpenRouter({
		input: {
			modelRouting: { primaryModel: 'openai/gpt-4o-mini' },
			messages: [{ role: 'user', content: 'Return JSON' }],
			outputMode: 'json_object',
			structuredOutput: { mode: 'json_object' },
		},
		sendChat: async () => ({
			response: { id: 'gen-1', choices: [{ message: { content: '[]' } }] },
			text: '[]',
		}),
	});

	assert.equal(result.kind, 'structured_output');
	assert.equal(result.error.originalRawText, '[]');
	assert.deepEqual(result.error.validationErrors, ['Response must be a non-null JSON object.']);
});

test('OpenRouter Execution sends a compatible initial chat completion request through the n8n adapter seam', async () => {
	const node = loadNode();
	const { context, requests } = createExecutionContext({
		model: { mode: 'list', value: 'openai/gpt-4o-mini' },
		promptMode: 'systemUser',
		systemMessage: 'Be precise',
		prompt: 'Report {{$json.prompt}}',
		generation: { temperature: 0.3, maxTokens: 150 },
		integrations: {
			langfuseTrace: true,
			headers: { values: [{ name: 'X-Trace-Group', value: 'boundary' }] },
			metadata: { values: [{ key: 'tenant', valueMode: 'string', value: 'acme' }] },
		},
		providerRouting: { allow: { values: [{ name: 'openai' }] }, allowFallbacks: 'false' },
	});

	const result = await node.execute.call(context);

	assert.equal(requests.length, 1);
	assert.equal(requests[0].method, 'POST');
	assert.equal(requests[0].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[0].url, '/chat/completions');
	assert.equal(requests[0].json, true);
	assert.deepEqual(requests[0].headers, {
		Authorization: 'Bearer test-openrouter-api-key',
		'HTTP-Referer': '',
		'X-OpenRouter-Title': '',
		'langfuse-trace-id': 'exec-boundary',
		'X-Trace-Group': 'boundary',
	});
	assert.equal(requests[0].body.model, 'openai/gpt-4o-mini');
	assert.deepEqual(requests[0].body.messages, [
		{ role: 'system', content: 'Be precise' },
		{ role: 'user', content: 'Report {{$json.prompt}}' },
	]);
	assert.equal(requests[0].body.temperature, 0.3);
	assert.equal(requests[0].body.max_tokens, 150);
	assert.deepEqual(requests[0].body.provider, { only: ['openai'], allow_fallbacks: false });
	assert.equal(requests[0].body.metadata.execution_id, 'exec-boundary');
	assert.equal(requests[0].body.metadata.workflow_id, 'workflow-boundary');
	assert.equal(requests[0].body.metadata.workflow_name, 'Boundary Workflow');
	assert.equal(requests[0].body.metadata.node_name, 'Openrouter LLM');
	assert.equal(requests[0].body.metadata.item_index, 0);
	assert.equal(requests[0].body.metadata.model, 'openai/gpt-4o-mini');
	assert.equal(requests[0].body.metadata.validation_attempt, 1);
	assert.equal(requests[0].body.metadata.tenant, 'acme');
	assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'response_format'), false);
	assert.equal(result[0][0].json.text, 'Done');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
});

test('OpenRouter Execution keeps structured repair requests compatible while returning repaired workflow data', async () => {
	const node = loadNode();
	const { context, requests } = createExecutionContext(
		{
			model: 'openai/gpt-4o-mini',
			promptMode: 'single',
			singlePrompt: 'Return JSON',
			generation: { temperature: 0.8, maxTokens: 100 },
			outputMode: 'json_object',
			maxValidationAttempts: 1,
			repair: { model: { value: 'anthropic/claude-3-haiku' }, temperature: 0.2, reasoningEffort: 'low' },
		},
		{
			responses: [
				{ id: 'gen-1', choices: [{ message: { role: 'assistant', content: 'not json' } }] },
				{ id: 'repair-1', choices: [{ message: { role: 'assistant', content: '{"json":{"ok":true}}' } }] },
			],
		},
	);

	const result = await node.execute.call(context);

	assert.equal(requests.length, 2);
	assert.deepEqual(requests[0].body.response_format, { type: 'json_object' });
	assert.equal(requests[0].body.metadata.validation_attempt, 1);
	assert.equal(requests[1].method, 'POST');
	assert.equal(requests[1].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[1].url, '/chat/completions');
	assert.equal(requests[1].body.model, 'anthropic/claude-3-haiku');
	assert.equal(requests[1].body.temperature, 0.2);
	assert.deepEqual(requests[1].body.reasoning, { effort: 'low' });
	assert.deepEqual(requests[1].body.response_format, { type: 'json_object' });
	assert.equal(requests[1].body.metadata.validation_attempt, 2);
	assert.equal(requests[1].body.metadata.model, 'anthropic/claude-3-haiku');
	assert.equal(requests[1].body.messages.length, 1);
	assert.equal(requests[1].body.messages[0].role, 'user');
	assert.match(requests[1].body.messages[0].content, /not json/);
	assert.match(requests[1].body.messages[0].content, /Validation error/i);
	assert.deepEqual(result[0][0].json.structured, { ok: true });
	assert.equal(result[0][0].json.text, '{"ok":true}');
	assert.deepEqual(result[0][0].json.structuredOutputRepair, {
		repaired: true,
		repairAttempts: 1,
	});
});
