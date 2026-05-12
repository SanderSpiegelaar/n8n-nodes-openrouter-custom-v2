const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	normalizeOpenRouterApiKey,
	mergeOpenRouterAuthenticatedHeaders,
} = require('../dist/nodes/OpenrouterLlm/execution/OpenRouterHeaders.js');

test('normalizeOpenRouterApiKey strips Bearer prefixes and invisible characters', () => {
	assert.equal(normalizeOpenRouterApiKey('\uFEFF Bearer sk-demo \u200b'), 'sk-demo');
	assert.equal(normalizeOpenRouterApiKey('  bearer bearer sk-demo '), 'sk-demo');
});

test('mergeOpenRouterAuthenticatedHeaders matches credential-style empty attribution headers', () => {
	const merged = mergeOpenRouterAuthenticatedHeaders(
		{
			apiKey: ' Bearer sk-fixtures ',
			siteUrl: '',
			appName: '',
		},
		{ 'X-Extra': '1' },
	);

	assert.deepEqual(merged, {
		Authorization: 'Bearer sk-fixtures',
		'HTTP-Referer': '',
		'X-OpenRouter-Title': '',
		'X-Extra': '1',
	});
});
