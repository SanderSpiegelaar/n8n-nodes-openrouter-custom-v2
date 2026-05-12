import type { INodeProperties } from 'n8n-workflow';

export const outputProperties: INodeProperties[] = [
	{
		displayName: 'Response Options',
		name: 'outputOptions',
		type: 'collection',
		placeholder: 'Add Response Option',
		default: {},
		options: [
			{
				displayName: 'Include Response Details',
				name: 'includeResponseDetails',
				type: 'boolean',
				default: false,
				description:
					'Whether to include the raw OpenRouter response and repair diagnostics in successful output',
			},
		],
	},
];
