import type { INodeProperties } from 'n8n-workflow';

export const providerRoutingProperties: INodeProperties[] = [
	{
		displayName: 'Provider Routing',
		name: 'providerRouting',
		type: 'collection',
		placeholder: 'Add Routing Option',
		default: {},
		options: [
			{
				displayName: 'Allow Fallbacks',
				name: 'allowFallbacks',
				type: 'options',
				options: [
					{ name: 'Default', value: '' },
					{ name: 'False', value: 'false' },
					{ name: 'True', value: 'true' },
				],
				default: '',
				description:
					'Override provider.allow_fallbacks. Default leaves the field unset on the wire.',
			},
			{
				displayName: 'Allow Providers',
				name: 'allow',
				type: 'fixedCollection',
				placeholder: 'Add Allowed Provider',
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
								description: 'Provider slug to allow. Empty rows are skipped.',
							},
						],
					},
				],
				description: 'Restrict routing to these providers (maps to provider.only)',
			},
			{
				displayName: 'Deny Providers',
				name: 'deny',
				type: 'fixedCollection',
				placeholder: 'Add Denied Provider',
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
								description: 'Provider slug to ignore. Empty rows are skipped.',
							},
						],
					},
				],
				description: 'Exclude these providers from routing (maps to provider.ignore)',
			},
			{
				displayName: 'Require Parameters Override',
				name: 'requireParameters',
				type: 'options',
				options: [
					{ name: 'Default', value: '' },
					{ name: 'False', value: 'false' },
					{ name: 'True', value: 'true' },
				],
				default: '',
				description:
					'Override provider.require_parameters. Default leaves the field unset on the wire.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Default', value: '' },
					{ name: 'Latency', value: 'latency' },
					{ name: 'Price', value: 'price' },
					{ name: 'Throughput', value: 'throughput' },
				],
				default: '',
				description: 'How OpenRouter should sort eligible providers. Default omits the field.',
			},
		],
	},
];
