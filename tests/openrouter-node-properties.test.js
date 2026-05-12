const assert = require('node:assert/strict');
const { test } = require('node:test');

function loadPropertiesModule() {
	return require('../dist/nodes/OpenrouterLlm/properties/OpenRouterNodeProperties.js');
}

function findProperty(properties, name) {
	return properties.find((property) => property.name === name);
}

function findOption(property, name) {
	return property.options.find((option) => option.name === name);
}

test('OpenRouter node properties expose the expected high-level parameter order', () => {
	const { nodeParameterSurface } = loadPropertiesModule();

	assert.deepEqual(
		nodeParameterSurface.map((property) => property.name),
		[
			'promptMode',
			'systemMessage',
			'prompt',
			'singlePrompt',
			'messagesJson',
			'model',
			'modelOptions',
			'reasoning',
			'outputMode',
			'jsonSchema',
			'outputOptions',
			'maxValidationAttempts',
			'repair',
			'providerRouting',
			'integrations',
			'generation',
			'advancedSampling',
		],
	);
});

test('OpenRouter node properties keep key defaults unchanged', () => {
	const { nodeParameterSurface } = loadPropertiesModule();
	const model = findProperty(nodeParameterSurface, 'model');
	const promptMode = findProperty(nodeParameterSurface, 'promptMode');
	const outputMode = findProperty(nodeParameterSurface, 'outputMode');
	const outputOptions = findProperty(nodeParameterSurface, 'outputOptions');
	const maxValidationAttempts = findProperty(nodeParameterSurface, 'maxValidationAttempts');
	const repair = findProperty(nodeParameterSurface, 'repair');
	const repairModel = findOption(repair, 'model');
	const repairReasoningEffort = findOption(repair, 'reasoningEffort');
	const repairTemperature = findOption(repair, 'temperature');

	assert.deepEqual(model.default, { mode: 'list', value: 'openai/gpt-oss-120b' });
	assert.equal(promptMode.default, 'systemUser');
	assert.equal(outputMode.default, 'text');
	assert.equal(findOption(outputOptions, 'includeResponseDetails').default, false);
	assert.equal(maxValidationAttempts.default, 2);
	assert.deepEqual(repairModel.default, { mode: 'list', value: 'openai/gpt-oss-120b:nitro' });
	assert.equal(repairReasoningEffort.default, 'none');
	assert.equal(repairTemperature.default, 0.1);
});

test('OpenRouter structured output fields stay gated by output mode', () => {
	const { nodeParameterSurface } = loadPropertiesModule();
	const jsonSchema = findProperty(nodeParameterSurface, 'jsonSchema');
	const maxValidationAttempts = findProperty(nodeParameterSurface, 'maxValidationAttempts');
	const repair = findProperty(nodeParameterSurface, 'repair');

	assert.deepEqual(jsonSchema.displayOptions.show.outputMode, ['json_schema']);
	assert.deepEqual(maxValidationAttempts.displayOptions.show.outputMode, [
		'json_object',
		'json_schema',
	]);
	assert.deepEqual(repair.displayOptions.show.outputMode, ['json_object', 'json_schema']);
});

test('OpenRouter model locator method names stay unchanged', () => {
	const { nodeParameterSurface } = loadPropertiesModule();
	const model = findProperty(nodeParameterSurface, 'model');
	const modelOptions = findProperty(nodeParameterSurface, 'modelOptions');
	const repair = findProperty(nodeParameterSurface, 'repair');
	const fallbackModels = findOption(modelOptions, 'fallbackModels');
	const fallbackModel = fallbackModels.options[0].values[0];
	const repairModel = findOption(repair, 'model');

	assert.equal(model.modes[0].typeOptions.searchListMethod, 'getOpenRouterModels');
	assert.equal(fallbackModel.typeOptions.loadOptionsMethod, 'getOpenRouterModelOptions');
	assert.equal(repairModel.modes[0].typeOptions.searchListMethod, 'getOpenRouterModels');
});
