import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { isUnset, validatePositiveNumber } from './validation';

export function buildPlugins(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject[] {
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const plugins: IDataObject[] = [];

	if ((integrations.responseHealing as boolean | undefined) ?? false) {
		plugins.push({ id: 'response-healing' });
	}

	const webPlugin = buildWebPlugin(executeFunctions, itemIndex);

	if (webPlugin !== undefined) {
		plugins.push(webPlugin);
	}

	return plugins;
}

export function buildWebPlugin(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject | undefined {
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;

	if (integrations.webEnabled !== true) {
		return undefined;
	}

	const plugin: IDataObject = { id: 'web' };

	if (!isUnset(integrations.webMaxResults)) {
		plugin.max_results = validatePositiveNumber(
			executeFunctions,
			integrations.webMaxResults,
			'Web Search Max Results',
		);
	}

	if (
		typeof integrations.webSearchPrompt === 'string' &&
		(integrations.webSearchPrompt as string).trim() !== ''
	) {
		plugin.search_prompt = integrations.webSearchPrompt;
	}

	return plugin;
}
