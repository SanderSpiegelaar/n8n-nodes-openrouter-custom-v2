const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/openrouter-test-context.js');

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
	assert.equal(
		Object.prototype.hasOwnProperty.call(effort.requests[0].body.reasoning, 'max_tokens'),
		false,
	);
	assert.deepEqual(tokenBudget.requests[0].body.reasoning, { max_tokens: 512, exclude: true });
	assert.equal(
		Object.prototype.hasOwnProperty.call(tokenBudget.requests[0].body.reasoning, 'effort'),
		false,
	);
	assert.deepEqual(defaultEnabled.requests[0].body.reasoning, {});
});


test('Openrouter LLM validates numeric typed controls before making a request', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const invalidCases = [
		[{ generation: { maxTokens: -1 } }, /max tokens must be greater than 0/i],
		[
			{ reasoning: { mode: 'tokenBudget', maxTokens: 0 } },
			/reasoning max tokens must be greater than 0/i,
		],
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

