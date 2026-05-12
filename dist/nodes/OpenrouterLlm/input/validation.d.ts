import type { IExecuteFunctions } from 'n8n-workflow';
export declare function validatePositiveNumber(executeFunctions: IExecuteFunctions, value: unknown, label: string): number;
export declare function validateRange(executeFunctions: IExecuteFunctions, value: unknown, label: string): number;
export declare function validateNonEmptyText(executeFunctions: IExecuteFunctions, value: unknown, label: string): string;
export declare function isUnset(value: unknown): boolean;
