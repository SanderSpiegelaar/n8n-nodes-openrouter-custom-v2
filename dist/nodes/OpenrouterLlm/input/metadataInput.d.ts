import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
export declare function buildMetadataExtras(executeFunctions: IExecuteFunctions, itemIndex: number): Record<string, unknown>;
export declare function buildMetadata(executeFunctions: IExecuteFunctions, itemIndex: number, model: string, attempt?: number): IDataObject;
