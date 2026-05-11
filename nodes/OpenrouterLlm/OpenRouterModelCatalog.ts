import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

const OPENROUTER_CUSTOM_CREDENTIAL_NAME = 'openRouterCustomV2Api';

type OpenRouterModel = {
	id: string;
	name?: string;
	architecture?: {
		output_modalities?: string[];
	};
};

export async function searchOpenRouterModelCatalog(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const normalizedFilter = filter?.toLowerCase() ?? '';
	const models = await loadOpenRouterModelCatalog.call(this);
	const results = models
		.filter((model) => modelMatchesFilter(model, normalizedFilter))
		.map(toModelOption)
		.sort((a, b) => a.value.toString().localeCompare(b.value.toString()));

	return { results };
}

export async function loadOpenRouterModelCatalogOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const models = await loadOpenRouterModelCatalog.call(this);

	return models.map(toModelOption).sort((a, b) => a.value.toString().localeCompare(b.value.toString()));
}

async function loadOpenRouterModelCatalog(this: ILoadOptionsFunctions): Promise<OpenRouterModel[]> {
	const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		OPENROUTER_CUSTOM_CREDENTIAL_NAME,
		{
			method: 'GET',
			baseURL: baseUrl,
			url: '/models',
			json: true,
		},
	)) as { data?: OpenRouterModel[] };

	return (response.data ?? []).filter(isSelectableTextModel);
}

function modelMatchesFilter(model: OpenRouterModel, normalizedFilter: string): boolean {
	if (normalizedFilter === '') {
		return true;
	}

	return (
		model.id.toLowerCase().includes(normalizedFilter) ||
		(model.name ?? '').toLowerCase().includes(normalizedFilter)
	);
}

function toModelOption(model: OpenRouterModel): INodePropertyOptions {
	return {
		name: model.id,
		value: model.id,
	};
}

function isSelectableTextModel(model: OpenRouterModel): boolean {
	return isTextModel(model) && model.id !== 'openrouter/auto';
}

function isTextModel(model: OpenRouterModel): boolean {
	const outputModalities = model.architecture?.output_modalities;

	return outputModalities === undefined || outputModalities.includes('text');
}
