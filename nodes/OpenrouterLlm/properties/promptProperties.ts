import type { INodeProperties } from 'n8n-workflow';

export const promptProperties: INodeProperties[] = [
	{
		displayName: 'Prompt Mode',
		name: 'promptMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Messages JSON',
				value: 'messagesJson',
				description: 'Send an array of chat messages from JSON',
				action: 'Send messages from JSON',
			},
			{
				name: 'Single Prompt',
				value: 'single',
				description: 'Send one compact user prompt',
				action: 'Send a single prompt',
			},
			{
				name: 'System and User',
				value: 'systemUser',
				description: 'Send an optional system message and one required user prompt',
				action: 'Send a system and user prompt',
			},
		],
		default: 'systemUser',
		description: 'How to assemble the chat messages sent to OpenRouter',
	},
	{
		displayName: 'System Message',
		name: 'systemMessage',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		displayOptions: {
			show: {
				promptMode: ['systemUser'],
			},
		},
		description: 'Optional system message to prepend to the request',
	},
	{
		displayName: 'User Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				promptMode: ['systemUser'],
			},
		},
		description: 'User message to send to the selected model',
	},
	{
		displayName: 'Prompt',
		name: 'singlePrompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				promptMode: ['single'],
			},
		},
		description: 'Single user message to send to the selected model',
	},
	{
		displayName: 'Messages JSON',
		name: 'messagesJson',
		type: 'json',
		default: '[]',
		required: true,
		displayOptions: {
			show: {
				promptMode: ['messagesJson'],
			},
		},
		description:
			'Array of chat messages with role and content. Roles can be system, user, or assistant.',
	},
];
