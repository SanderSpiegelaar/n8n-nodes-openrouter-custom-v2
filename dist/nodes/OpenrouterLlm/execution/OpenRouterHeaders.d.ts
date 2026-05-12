import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
export declare function normalizeOpenRouterApiKey(raw: unknown): string;
export declare function buildOpenRouterHeaders(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject;
export declare function mergeOpenRouterAuthenticatedHeaders(credentials: IDataObject, requestHeaders: IDataObject): IDataObject;
