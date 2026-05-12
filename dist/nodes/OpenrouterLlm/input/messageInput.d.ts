import type { IExecuteFunctions } from 'n8n-workflow';
import type { ChatMessage } from '../execution/OpenRouterExecution';
export declare function buildMessages(executeFunctions: IExecuteFunctions, itemIndex: number): ChatMessage[];
