import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'] as const;

type CustomHeaders = {
	values?: Array<{ name?: string; value?: string }>;
};

export function buildOpenRouterHeaders(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): IDataObject {
	const headers: IDataObject = {};
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const langfuseTrace = (integrations.langfuseTrace as boolean | undefined) ?? true;
	const customHeaders = (integrations.headers as CustomHeaders | undefined) ?? {};

	if (langfuseTrace) {
		headers['langfuse-trace-id'] = executeFunctions.getExecutionId();
	}

	for (const header of customHeaders.values ?? []) {
		const name = header.name ?? '';

		if (name.trim() === '') {
			continue;
		}

		if (PROTECTED_HEADERS.includes(name.toLowerCase() as (typeof PROTECTED_HEADERS)[number])) {
			throw new NodeOperationError(executeFunctions.getNode(), `${name} is a protected header.`);
		}

		headers[name] = header.value ?? '';
	}

	return headers;
}

export function mergeOpenRouterAuthenticatedHeaders(
	credentials: IDataObject,
	requestHeaders: IDataObject,
): IDataObject {
	const out: IDataObject = { ...requestHeaders };
	const rawKey = credentials.apiKey;
	const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
	if (apiKey !== '') {
		out.Authorization = `Bearer ${apiKey}`;
	}
	const siteUrl = credentials.siteUrl;
	if (typeof siteUrl === 'string' && siteUrl.trim() !== '') {
		out['HTTP-Referer'] = siteUrl.trim();
	}
	const appName = credentials.appName;
	if (typeof appName === 'string' && appName.trim() !== '') {
		out['X-OpenRouter-Title'] = appName.trim();
	}
	return out;
}
