import { type ValidateFunction } from 'ajv';
export type StructuredOutputMode = 'text' | 'json_object' | 'json_schema';
export type StructuredValidationIssue = {
    message: string;
    path: string;
    keyword?: string;
    schemaPath?: string;
    params?: Record<string, unknown>;
};
export type StructuredValidationResult = {
    ok: true;
    value: unknown;
} | {
    ok: false;
    errors: string[];
    details: StructuredValidationIssue[];
};
export declare function compileStructuredOutputSchema(schema: unknown): ValidateFunction;
export declare function extractStructuredJson(rawText: string): StructuredValidationResult;
export declare function validateStructuredOutput(mode: StructuredOutputMode, rawText: string, compiledValidator: ValidateFunction | undefined): StructuredValidationResult;
