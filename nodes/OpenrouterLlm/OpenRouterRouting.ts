import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { StructuredOutputMode } from './StructuredOutputParser';

export type ModelLocatorValue =
	| string
	| {
			value?: string;
	  };

const SUPPORTED_MODEL_VARIANTS = [
	':exacto',
	':extended',
	':floor',
	':free',
	':nitro',
	':online',
] as const;

export function resolvePrimaryModel(executeFunctions: IExecuteFunctions, itemIndex: number): string {
	const modelParameter = executeFunctions.getNodeParameter('model', itemIndex) as ModelLocatorValue;
	const modelId = resolveModelLocator(modelParameter, '');
	const modelVariant = getSelectedModelVariant(executeFunctions, itemIndex);

	if (modelId.trim() === '') {
		throw new NodeOperationError(executeFunctions.getNode(), 'Model ID must not be empty.');
	}

	if (modelVariant === '') {
		return modelId;
	}

	if (!isSupportedModelVariant(modelVariant)) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Unsupported model variant selected.');
	}

	return `${stripSupportedVariant(modelId)}${modelVariant}`;
}

export function getSelectedModelVariant(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): string {
	const modelOptions = executeFunctions.getNodeParameter(
		'modelOptions',
		itemIndex,
		{},
	) as IDataObject;

	return (modelOptions.modelVariant as string | undefined) ?? '';
}

export function resolveModelLocator(
	modelParameter: ModelLocatorValue | undefined,
	defaultModel: string,
): string {
	if (modelParameter === undefined) {
		return defaultModel;
	}

	return typeof modelParameter === 'string'
		? modelParameter
		: (modelParameter.value ?? defaultModel).toString();
}

export function resolveFallbackModels(executeFunctions: IExecuteFunctions, itemIndex: number): string[] {
	const modelOptions = executeFunctions.getNodeParameter(
		'modelOptions',
		itemIndex,
		{},
	) as IDataObject;
	const fallbackModels =
		(modelOptions.fallbackModels as
			| {
					values?: Array<{ model?: string }>;
			  }
			| undefined) ?? {};

	return (fallbackModels.values ?? [])
		.map((fallback) => fallback.model?.trim() ?? '')
		.filter((model) => model !== '');
}

export function stripSupportedVariant(modelId: string): string {
	const supportedVariant = SUPPORTED_MODEL_VARIANTS.find((variant) => modelId.endsWith(variant));

	if (!supportedVariant) {
		return modelId;
	}

	return modelId.slice(0, -supportedVariant.length);
}

export function buildProvider(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	outputMode: StructuredOutputMode = 'text',
): IDataObject | undefined {
	const provider: IDataObject = {};
	const routing = executeFunctions.getNodeParameter(
		'providerRouting',
		itemIndex,
		{},
	) as IDataObject;
	const allow = collectProviderNamesFromCollection(
		routing.allow as { values?: Array<{ name?: string }> } | undefined,
	);
	const deny = collectProviderNamesFromCollection(
		routing.deny as { values?: Array<{ name?: string }> } | undefined,
	);
	const sort = (routing.sort as string | undefined) ?? '';
	const allowFallbacks = (routing.allowFallbacks as string | undefined) ?? '';
	const requireParameters = (routing.requireParameters as string | undefined) ?? '';

	if (allow.length > 0) {
		provider.only = allow;
	}

	if (deny.length > 0) {
		provider.ignore = deny;
	}

	if (sort !== '') {
		provider.sort = sort;
	}

	if (allowFallbacks === 'true' || allowFallbacks === 'false') {
		provider.allow_fallbacks = allowFallbacks === 'true';
	}

	if (requireParameters === 'true' || requireParameters === 'false') {
		provider.require_parameters = requireParameters === 'true';
	} else if (outputMode === 'json_schema') {
		provider.require_parameters = true;
	}

	return Object.keys(provider).length === 0 ? undefined : provider;
}

export function validateRouting(
	executeFunctions: IExecuteFunctions,
	modelVariant: string,
	provider: IDataObject | undefined,
	webPluginEnabled: boolean = false,
): void {
	if (webPluginEnabled && modelVariant === ':online') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :online conflicts with the Web Search Plugin. Disable one of the two — both routes inject web search results.',
		);
	}

	if (provider === undefined) {
		return;
	}

	if (provider.sort !== undefined && modelVariant === ':nitro') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :nitro conflicts with Provider Sort. Remove one of the two — :nitro already requests throughput routing.',
		);
	}

	if (provider.sort !== undefined && modelVariant === ':floor') {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Model Variant :floor conflicts with Provider Sort. Remove one of the two — :floor already requests price routing.',
		);
	}

	const allow = Array.isArray(provider.only) ? (provider.only as string[]) : [];
	const deny = Array.isArray(provider.ignore) ? (provider.ignore as string[]) : [];

	if (allow.length > 0 && deny.length > 0) {
		const denyNormalized = new Set(deny.map((name) => name.trim().toLowerCase()));
		const conflict = allow.find((name) => denyNormalized.has(name.trim().toLowerCase()));

		if (conflict !== undefined) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Provider "${conflict}" appears in both Allow Providers and Deny Providers. Remove it from one list.`,
			);
		}
	}
}

function collectProviderNamesFromCollection(
	collection: { values?: Array<{ name?: string }> } | undefined,
): string[] {
	return ((collection ?? {}).values ?? [])
		.map((row) => row.name?.trim() ?? '')
		.filter((name) => name !== '');
}

function isSupportedModelVariant(
	modelVariant: string,
): modelVariant is (typeof SUPPORTED_MODEL_VARIANTS)[number] {
	return SUPPORTED_MODEL_VARIANTS.includes(
		modelVariant as (typeof SUPPORTED_MODEL_VARIANTS)[number],
	);
}
