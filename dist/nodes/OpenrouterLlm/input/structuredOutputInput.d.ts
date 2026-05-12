import type { IExecuteFunctions } from 'n8n-workflow';
import type { OpenRouterExecutionInput } from '../execution/OpenRouterExecution';
import type { CompiledStructuredSchema, OutputMode } from '../execution/OpenRouterExecutionInputBuilder';
export declare function buildStructuredOutputExecutionConfig(executeFunctions: IExecuteFunctions, itemIndex: number, outputMode: OutputMode, compiledSchema: CompiledStructuredSchema | undefined, maxRepairAttempts: number): OpenRouterExecutionInput['structuredOutput'];
