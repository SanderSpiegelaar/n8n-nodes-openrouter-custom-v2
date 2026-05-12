const assert = require('node:assert/strict');
const { test } = require('node:test');

const packageJson = require('../package.json');

test('package wiring points at Openrouter LLM node and OpenRouter API credential', () => {
	assert.deepEqual(packageJson.n8n.nodes, ['dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js']);
	assert.deepEqual(packageJson.n8n.credentials, ['dist/credentials/OpenRouterApi.credentials.js']);
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
	assert.equal(
		credential.authenticate.properties.headers.Authorization,
		'={{"Bearer " + $credentials.apiKey}}',
	);
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


test('Openrouter LLM keeps the workflow-compatible top-level parameter surface', () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();

	assert.deepEqual(
		node.description.properties.map((property) => ({
			name: property.name,
			default: property.default,
		})),
		[
			{ name: 'model', default: { mode: 'list', value: 'openai/gpt-oss-120b' } },
			{ name: 'modelOptions', default: {} },
			{ name: 'promptMode', default: 'systemUser' },
			{ name: 'systemMessage', default: '' },
			{ name: 'prompt', default: '' },
			{ name: 'singlePrompt', default: '' },
			{ name: 'messagesJson', default: '[]' },
			{ name: 'generation', default: {} },
			{ name: 'reasoning', default: {} },
			{ name: 'advancedSampling', default: {} },
			{ name: 'integrations', default: {} },
			{ name: 'providerRouting', default: {} },
			{ name: 'outputMode', default: 'text' },
			{ name: 'jsonSchema', default: '{}' },
			{ name: 'maxValidationAttempts', default: 2 },
			{ name: 'repair', default: {} },
		],
	);
});


test('OpenRouter model catalog loads shared sorted text model options for lists and search', async () => {
	const {
		loadOpenRouterModelCatalogOptions,
		searchOpenRouterModelCatalog,
	} = require('../dist/nodes/OpenrouterLlm/catalog/OpenRouterModelCatalog.js');
	const requests = [];
	const sharedPayload = () => ({
		data: [
			{
				id: 'z/provider-model',
				name: 'Provider Model',
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
			{
				id: 'anthropic/claude-3-haiku',
				name: 'Claude 3 Haiku',
				architecture: { output_modalities: ['text'] },
			},
		],
	});
	const context = {
		getCredentials: async () => ({
			baseUrl: 'https://openrouter.ai/api/v1///',
			apiKey: 'test-catalog-key',
		}),
		helpers: {
			httpRequest: async (requestOptions) => {
				requests.push(requestOptions);
				return sharedPayload();
			},
		},
	};

	const options = await loadOpenRouterModelCatalogOptions.call(context);
	const searchResult = await searchOpenRouterModelCatalog.call(context, 'CLAUDE');

	assert.equal(requests.length, 2);
	assert.equal(requests[0].method, 'GET');
	assert.equal(requests[0].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[0].url, '/models');
	assert.deepEqual(options, [
		{ name: 'anthropic/claude-3-haiku', value: 'anthropic/claude-3-haiku' },
		{ name: 'z/provider-model', value: 'z/provider-model' },
	]);
	assert.deepEqual(searchResult.results, [
		{ name: 'anthropic/claude-3-haiku', value: 'anthropic/claude-3-haiku' },
	]);
});


test('Openrouter LLM loads searchable text model options from OpenRouter', async () => {
	const { OpenrouterLlm } = require('../dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js');
	const node = new OpenrouterLlm();
	const requests = [];
	const sharedPayload = () => ({
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
	});
	const context = {
		getCredentials: async () => ({
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: 'test-catalog-key',
		}),
		helpers: {
			httpRequest: async (requestOptions) => {
				requests.push(requestOptions);
				return sharedPayload();
			},
		},
	};

	const result = await node.methods.listSearch.getOpenRouterModels.call(context, 'gpt');

	assert.equal(requests[0].method, 'GET');
	assert.equal(requests[0].baseURL, 'https://openrouter.ai/api/v1');
	assert.equal(requests[0].url, '/models');
	assert.deepEqual(result.results, [{ name: 'openai/gpt-4o-mini', value: 'openai/gpt-4o-mini' }]);
});
