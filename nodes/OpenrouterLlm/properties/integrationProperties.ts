import type { INodeProperties } from 'n8n-workflow';

export const integrationProperties: INodeProperties[] = [
	{
		displayName: 'Integrations',
		name: 'integrations',
		type: 'collection',
		placeholder: 'Add Integration Option',
		default: {},
		options: [
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				placeholder: 'Add Header',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Header name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value',
							},
						],
					},
				],
				description:
					'Custom request headers. Authorization and OpenRouter identity headers are protected.',
			},
			{
				displayName: 'Langfuse Trace',
				name: 'langfuseTrace',
				type: 'boolean',
				default: true,
				description: 'Whether to add the Langfuse trace header using the n8n execution identifier',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Metadata key',
							},
							{
								displayName: 'Value Mode',
								name: 'valueMode',
								type: 'options',
								options: [
									{ name: 'JSON', value: 'json' },
									{ name: 'String', value: 'string' },
								],
								default: 'string',
								description: 'How to parse the metadata value',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Metadata value',
							},
						],
					},
				],
				description: 'Extra request metadata sent in the body only',
			},
			{
				displayName: 'Response Healing',
				name: 'responseHealing',
				type: 'boolean',
				default: false,
				description: 'Whether to enable the OpenRouter response-healing plugin',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				description: 'OpenRouter session identifier',
			},
			{
				displayName: 'Web Search Enabled',
				name: 'webEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to enable the OpenRouter web search plugin',
			},
			{
				displayName: 'Web Search Max Results',
				name: 'webMaxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: '',
				displayOptions: {
					show: {
						webEnabled: [true],
					},
				},
				description: 'Maximum number of web results to attach to the request',
			},
			{
				displayName: 'Web Search Prompt',
				name: 'webSearchPrompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				displayOptions: {
					show: {
						webEnabled: [true],
					},
				},
				description: 'Custom prompt prefix the web plugin should use when summarizing results',
			},
		],
	},
];
