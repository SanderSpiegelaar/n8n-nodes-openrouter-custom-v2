const assert = require('node:assert/strict');
const { test } = require('node:test');

function loadPropertiesModule() {
	return require('../dist/nodes/OpenrouterLlm/OpenRouterNodeProperties.js');
}

test('OpenRouter node properties expose the expected high-level parameter order', () => {
	const { nodeParameterSurface } = loadPropertiesModule();

	assert.deepEqual(
		nodeParameterSurface.map((property) => property.name),
		[
			'model',
			'modelOptions',
			'promptMode',
			'systemMessage',
			'prompt',
			'singlePrompt',
			'messagesJson',
			'generation',
			'reasoning',
			'advancedSampling',
			'integrations',
			'providerRouting',
			'outputMode',
			'jsonSchema',
			'maxValidationAttempts',
			'repair',
		],
	);
});
