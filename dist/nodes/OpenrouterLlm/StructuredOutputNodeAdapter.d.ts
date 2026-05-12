import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type StructuredValidationIssue } from './StructuredOutputParser';
import type { CompiledStructuredSchema, JsonSchemaResponseFormat } from './OpenRouterExecutionInputBuilder';
export type StructuredOutputFailureDiagnostics = {
    errors: string[];
    details: StructuredValidationIssue[];
    originalRawText: string;
    latestRepairText: string;
};
export declare function compileSchema(executeFunctions: IExecuteFunctions, itemIndex: number): CompiledStructuredSchema;
export declare function normalizeJsonSchemaResponseFormat(parsed: unknown): JsonSchemaResponseFormat;
export declare function isOpenAiJsonSchemaWrapper(value: unknown): value is {
    name?: unknown;
    schema: unknown;
    strict?: unknown;
};
export declare function buildStructuredOutputError(executeFunctions: IExecuteFunctions, itemIndex: number, attempt: number, diagnostics: StructuredOutputFailureDiagnostics): NodeOperationError;
export declare function getStructuredOutputDiagnosticFields(error: unknown): IDataObject;
export declare function truncateForError(text: string): string;
