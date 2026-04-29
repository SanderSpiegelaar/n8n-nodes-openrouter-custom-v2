const assert = require('node:assert/strict');
const { test } = require('node:test');

const packageJson = require('../package.json');

test('package wiring points at Openrouter LLM node and OpenRouter API credential', () => {
	assert.deepEqual(packageJson.n8n.nodes, ['dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js']);
	assert.deepEqual(packageJson.n8n.credentials, [
		'dist/credentials/OpenRouterApi.credentials.js',
	]);
});

test('OpenRouter API credential exposes secure API key and attribution fields', () => {
	const { OpenRouterApi } = require('../dist/credentials/OpenRouterApi.credentials.js');
	const credential = new OpenRouterApi();

	assert.equal(credential.name, 'openRouterApi');
	assert.equal(credential.displayName, 'OpenRouter API');

	const propertiesByName = Object.fromEntries(
		credential.properties.map((property) => [property.name, property]),
	);

	assert.equal(propertiesByName.apiKey.typeOptions.password, true);
	assert.equal(propertiesByName.baseUrl.default, 'https://openrouter.ai/api/v1');
	assert.ok(propertiesByName.siteUrl);
	assert.ok(propertiesByName.appName);
});

test('Openrouter LLM posts one chat completion request per input item', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const requests = [];
	const inputItems = [{ json: { prompt: 'Summarize the status' } }];

	const context = {
		getInputData: () => inputItems,
		getNodeParameter: (name) => {
			const parameters = {
				model: 'openai/gpt-4o-mini',
				prompt: '={{$json.prompt}}',
				systemMessage: 'Be concise',
				temperature: 0.2,
				maxTokens: 100,
			};

			return parameters[name];
		},
		getNode: () => ({ name: 'Openrouter LLM', type: 'openrouterLlm' }),
		getCredentials: async () => ({ baseUrl: 'https://openrouter.ai/api/v1' }),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, requestOptions) => {
				requests.push(requestOptions);
				return {
					id: 'gen-1',
					choices: [{ message: { role: 'assistant', content: 'Done' } }],
				};
			},
		},
	};

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
		temperature: 0.2,
		max_tokens: 100,
	});
	assert.equal(result[0][0].json.text, 'Done');
	assert.equal(result[0][0].json.response.id, 'gen-1');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
});
