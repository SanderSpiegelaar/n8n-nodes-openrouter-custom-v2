import type { IExecuteFunctions } from 'n8n-workflow';
import type { OpenRouterExecutionInput } from '../execution/OpenRouterExecution';
export declare function buildSamplingInput(executeFunctions: IExecuteFunctions, itemIndex: number): OpenRouterExecutionInput['sampling'];
