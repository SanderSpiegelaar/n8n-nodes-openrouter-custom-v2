const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createExecutionContext } = require('./helpers/openrouter-test-context.js');

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
	assert.deepEqual(result[0][0].json, { output: 'Done' });
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
