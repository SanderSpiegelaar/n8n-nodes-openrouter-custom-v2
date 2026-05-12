function createExecutionContext(parameters, overrides = {}) {
	const requests = [];
	const inputItems = overrides.inputItems ?? [{ json: { prompt: 'Summarize the status' } }];
	const responder =
		overrides.responder ??
		(() => ({
			id: 'gen-1',
			choices: [{ message: { role: 'assistant', content: 'Done' } }],
		}));

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
			getExecutionId: () => overrides.executionId ?? 'exec-1',
			getWorkflow: () => ({
				id: overrides.workflowId ?? 'workflow-1',
				name: overrides.workflowName ?? 'Workflow One',
			}),
			getCredentials: async () => ({ baseUrl: 'https://openrouter.ai/api/v1' }),
			continueOnFail: () => overrides.continueOnFail ?? false,
			helpers: {
				httpRequestWithAuthentication: async (_credentialType, requestOptions) => {
					const snapshot = JSON.parse(JSON.stringify(requestOptions));
					requests.push(snapshot);
					return responder(requestOptions, requests.length - 1);
				},
			},
		},
	};
}

module.exports = { createExecutionContext };
