import type { INodeProperties } from 'n8n-workflow';

import {
	DEFAULT_REPAIR_MODEL,
	DEFAULT_REPAIR_PROMPT_TEMPLATE,
	DEFAULT_REPAIR_REASONING_EFFORT,
	DEFAULT_REPAIR_TEMPERATURE,
} from '../structured-output/StructuredOutputParser';

export const structuredOutputRepairProperties: INodeProperties[] = [
	{
		displayName: 'Max Repair Attempts',
		name: 'maxValidationAttempts',
		type: 'number',
		typeOptions: {
			minValue: 0,
			maxValue: 5,
		},
		default: 2,
		displayOptions: {
			show: {
				outputMode: ['json_object', 'json_schema'],
			},
		},
		description: 'Maximum repair calls after the initial response before failing',
	},
	{
		displayName: 'Repair',
		name: 'repair',
		type: 'collection',
		placeholder: 'Add Repair Option',
		default: {},
		displayOptions: {
			show: {
				outputMode: ['json_object', 'json_schema'],
			},
		},
		options: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: DEFAULT_REPAIR_MODEL },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getOpenRouterModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
				description: 'OpenRouter model to use only for structured-output repair calls',
			},
			{
				displayName: 'Prompt Template',
				name: 'promptTemplate',
				type: 'string',
				typeOptions: { rows: 8 },
				default: DEFAULT_REPAIR_PROMPT_TEMPLATE,
				description:
					'Custom repair prompt. Must include {instructions}, {completion}, and {error}. Empty uses the default template.',
			},
			{
				displayName: 'Reasoning Effort',
				name: 'reasoningEffort',
				type: 'options',
				options: [
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'Minimal', value: 'minimal' },
					{ name: 'None', value: 'none' },
				],
				default: DEFAULT_REPAIR_REASONING_EFFORT,
				description: 'Reasoning effort to send on repair requests',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				default: DEFAULT_REPAIR_TEMPERATURE,
				description: 'Temperature to send on repair requests',
			},
		],
	},
];
