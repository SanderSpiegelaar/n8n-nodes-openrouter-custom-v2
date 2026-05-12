import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const ZERO_WIDTH_CHARS = /\uFEFF|[\u200B-\u200D]/gu;

/** Normalizes pasted OpenRouter API keys (Bearer prefix / invisible chars common in UX copy.) */
export function normalizeOpenRouterApiKey(raw: unknown): string {
	if (typeof raw !== 'string') {
		return '';
	}

	let trimmed = raw.trim().replace(ZERO_WIDTH_CHARS, '');

	while (/^bearer\s+/i.test(trimmed)) {
		trimmed = trimmed.replace(/^bearer\s+/i, '').trim();
	}

	return trimmed;
}

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

	const apiKey = normalizeOpenRouterApiKey(credentials.apiKey);
	if (apiKey !== '') {
		out.Authorization = `Bearer ${apiKey}`;
	}

	// Align with credential generic auth: expressions always emit these headers (possibly empty strings).
	const siteUrl = credentials.siteUrl;
	out['HTTP-Referer'] = typeof siteUrl === 'string' ? siteUrl.trim().replace(ZERO_WIDTH_CHARS, '') : '';
	const appName = credentials.appName;
	out['X-OpenRouter-Title'] = typeof appName === 'string' ? appName.trim().replace(ZERO_WIDTH_CHARS, '') : '';

	return out;
}
