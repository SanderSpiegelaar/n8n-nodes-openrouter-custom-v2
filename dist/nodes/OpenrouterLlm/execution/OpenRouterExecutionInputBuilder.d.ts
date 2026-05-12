import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { ValidateFunction } from 'ajv';
import { type StructuredOutputMode } from '../structured-output/StructuredOutputParser';
import type { OpenRouterExecutionInput } from './OpenRouterExecution';
import { buildWebPlugin } from '../input/pluginInput';
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
export { buildWebPlugin };
export declare function buildOpenRouterExecutionInput(executeFunctions: IExecuteFunctions, itemIndex: number, provider: IDataObject | undefined, outputMode: OutputMode, compiledSchema: CompiledStructuredSchema | undefined, maxRepairAttempts: number): OpenRouterExecutionInput;
