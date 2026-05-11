import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { StructuredOutputMode } from './StructuredOutputParser';
export type ModelLocatorValue = string | {
    value?: string;
};
export declare function resolvePrimaryModel(executeFunctions: IExecuteFunctions, itemIndex: number): string;
export declare function getSelectedModelVariant(executeFunctions: IExecuteFunctions, itemIndex: number): string;
export declare function resolveModelLocator(modelParameter: ModelLocatorValue | undefined, defaultModel: string): string;
export declare function resolveFallbackModels(executeFunctions: IExecuteFunctions, itemIndex: number): string[];
export declare function stripSupportedVariant(modelId: string): string;
export declare function buildProvider(executeFunctions: IExecuteFunctions, itemIndex: number, outputMode?: StructuredOutputMode): IDataObject | undefined;
export declare function validateRouting(executeFunctions: IExecuteFunctions, modelVariant: string, provider: IDataObject | undefined, webPluginEnabled?: boolean): void;
