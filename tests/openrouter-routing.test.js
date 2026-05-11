const assert = require('node:assert/strict');
const { test } = require('node:test');

function createRoutingContext(parameters) {
	return {
		getNodeParameter(name, _itemIndex, defaultValue) {
			return Reflect.has(parameters, name) ? parameters[name] : defaultValue;
		},
		getNode() {
			return { name: 'Openrouter LLM', type: 'openrouterLlm' };
		},
	};
}

function loadRoutingModule() {
	return require('../dist/nodes/OpenrouterLlm/OpenRouterRouting.js');
}

test('OpenRouter routing resolves primary model variants after stripping existing variants', () => {
	const { resolvePrimaryModel } = loadRoutingModule();
	const context = createRoutingContext({
		model: { value: 'openai/gpt-4o-mini:online' },
		modelOptions: { modelVariant: ':nitro' },
	});

	assert.equal(resolvePrimaryModel(context, 0), 'openai/gpt-4o-mini:nitro');
});

test('OpenRouter routing maps provider allow, deny, sort, and structured schema defaults', () => {
	const { buildProvider } = loadRoutingModule();
	const context = createRoutingContext({
		providerRouting: {
			allow: { values: [{ name: ' openai ' }, { name: '' }] },
			deny: { values: [{ name: 'anthropic' }] },
			sort: 'throughput',
			allowFallbacks: 'false',
			requireParameters: '',
		},
	});

	assert.deepEqual(buildProvider(context, 0, 'json_schema'), {
		only: ['openai'],
		ignore: ['anthropic'],
		sort: 'throughput',
		allow_fallbacks: false,
		require_parameters: true,
	});
});

test('OpenRouter routing validates model variant and provider conflicts', () => {
	const { validateRouting } = loadRoutingModule();
	const context = createRoutingContext({});

	assert.throws(
		() => validateRouting(context, ':online', undefined, true),
		/Model Variant :online conflicts with the Web Search Plugin/,
	);
	assert.throws(
		() => validateRouting(context, ':nitro', { sort: 'throughput' }, false),
		/Model Variant :nitro conflicts with Provider Sort/,
	);
	assert.throws(
		() => validateRouting(context, '', { only: ['OpenAI'], ignore: [' openai '] }, false),
		/appears in both Allow Providers and Deny Providers/,
	);
});
