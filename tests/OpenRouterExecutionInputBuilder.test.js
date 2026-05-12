const assert = require('node:assert/strict');
const { test } = require('node:test');

function createBuilderContext(parameters, overrides = {}) {
	const readParameter = (name, defaultValue) =>
		Reflect.has(parameters, name) ? parameters[name] : defaultValue;

	return {
		getNodeParameter: (name, _itemIndex, defaultValue) => readParameter(name, defaultValue),
		getNode: () => ({ name: 'Openrouter LLM', type: 'openrouterLlm' }),
		getExecutionId: () => overrides.executionId ?? 'exec-builder',
		getWorkflow: () => ({
			id: overrides.workflowId ?? 'workflow-builder',
			name: overrides.workflowName ?? 'Builder Workflow',
		}),
	};
}

function loadBuilderModule() {
	return require('../dist/nodes/OpenrouterLlm/execution/OpenRouterExecutionInputBuilder.js');
}

test('OpenRouter Execution input builder maps system/user prompt and sampling controls', () => {
	const { buildOpenRouterExecutionInput } = loadBuilderModule();
	const context = createBuilderContext({
		model: { value: 'openai/gpt-4o-mini' },
		modelOptions: {},
		promptMode: 'systemUser',
		systemMessage: 'Follow policy',
		prompt: 'Summarize status',
		generation: { temperature: 0.4, maxTokens: 200, promptCacheKey: 'status' },
		advancedSampling: { topK: 40, minP: 0.1 },
		integrations: {},
		reasoning: {},
	});

	const input = buildOpenRouterExecutionInput(context, 0, undefined, 'text', undefined, 0);

	assert.deepEqual(input.modelRouting, {
		primaryModel: 'openai/gpt-4o-mini',
		fallbackModels: [],
	});
	assert.deepEqual(input.messages, [
		{ role: 'system', content: 'Follow policy' },
		{ role: 'user', content: 'Summarize status' },
	]);
	assert.deepEqual(input.sampling, {
		temperature: 0.4,
		maxTokens: 200,
		topP: undefined,
		frequencyPenalty: undefined,
		presencePenalty: undefined,
		promptCacheKey: 'status',
		seed: undefined,
		stop: undefined,
		topK: 40,
		repetitionPenalty: undefined,
		minP: 0.1,
		topA: undefined,
		transforms: undefined,
	});
});

test('OpenRouter Execution input builder validates messages JSON roles and content', () => {
	const { buildOpenRouterExecutionInput } = loadBuilderModule();
	const context = createBuilderContext({
		model: 'openai/gpt-4o-mini',
		modelOptions: {},
		promptMode: 'messagesJson',
		messagesJson: JSON.stringify([{ role: 'tool', content: 'bad' }]),
		generation: {},
		advancedSampling: {},
		integrations: {},
		reasoning: {},
	});

	assert.throws(
		() => buildOpenRouterExecutionInput(context, 0, undefined, 'text', undefined, 0),
		/Message 1 role must be one of system, user, assistant/,
	);
});

test('OpenRouter Execution input builder maps metadata, plugins, reasoning, and repair defaults', () => {
	const { buildOpenRouterExecutionInput } = loadBuilderModule();
	const context = createBuilderContext({
		model: 'openai/gpt-4o-mini:online',
		modelOptions: { modelVariant: ':nitro' },
		promptMode: 'single',
		singlePrompt: 'Return JSON',
		generation: {},
		advancedSampling: {},
		integrations: {
			metadata: { values: [{ key: 'tenant', valueMode: 'text', value: 'acme' }] },
			responseHealing: true,
			webEnabled: true,
			webMaxResults: 3,
			sessionId: 'session-1',
		},
		reasoning: { mode: 'tokenBudget', maxTokens: 100, exclude: true },
		repair: {},
	});

	const input = buildOpenRouterExecutionInput(context, 2, undefined, 'json_object', undefined, 2);

	assert.equal(input.modelRouting.primaryModel, 'openai/gpt-4o-mini:nitro');
	assert.deepEqual(input.metadata.defaults, {
		executionId: 'exec-builder',
		workflowId: 'workflow-builder',
		workflowName: 'Builder Workflow',
		nodeName: 'Openrouter LLM',
		itemIndex: 2,
	});
	assert.deepEqual(input.metadata.extras, { tenant: 'acme' });
	assert.deepEqual(input.plugins, [{ id: 'response-healing' }, { id: 'web', max_results: 3 }]);
	assert.equal(input.sessionId, 'session-1');
	assert.deepEqual(input.reasoning, {
		request: { max_tokens: 100, exclude: true },
		excludeFromResponse: true,
	});
	assert.equal(input.structuredOutput.mode, 'json_object');
	assert.equal(input.structuredOutput.repair.maxAttempts, 2);
	assert.equal(input.structuredOutput.repair.model, 'openai/gpt-oss-120b:nitro');
	assert.equal(input.structuredOutput.repair.temperature, 0.1);
	assert.equal(input.structuredOutput.repair.reasoningEffort, 'none');
	assert.deepEqual(input.structuredOutput.repair.metadata(2, 'repair-model'), {
		execution_id: 'exec-builder',
		workflow_id: 'workflow-builder',
		workflow_name: 'Builder Workflow',
		node_name: 'Openrouter LLM',
		item_index: 2,
		model: 'repair-model',
		validation_attempt: 2,
		tenant: 'acme',
	});
});
