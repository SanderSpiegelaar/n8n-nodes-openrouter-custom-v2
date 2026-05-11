import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { ValidateFunction } from 'ajv';
import { type StructuredOutputMode } from './StructuredOutputParser';
import type { OpenRouterExecutionInput } from './OpenRouterExecution';
export type OutputMode = StructuredOutputMode;
export type JsonSchemaResponseFormat = {
    name: string;
    schema: unknown;
    strict: boolean;
};
export type CompiledStructuredSchema = {
    validator: ValidateFunction;
    responseFormat: JsonSchemaResponseFormat;
};
export declare function buildOpenRouterExecutionInput(executeFunctions: IExecuteFunctions, itemIndex: number, provider: IDataObject | undefined, outputMode: OutputMode, compiledSchema: CompiledStructuredSchema | undefined, maxRepairAttempts: number): OpenRouterExecutionInput;
export declare function buildWebPlugin(executeFunctions: IExecuteFunctions, itemIndex: number): IDataObject | undefined;
