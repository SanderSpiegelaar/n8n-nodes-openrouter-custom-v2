import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ChatMessage } from '../execution/OpenRouterExecution';
import { validateNonEmptyText } from './validation';

const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;

export function buildMessages(executeFunctions: IExecuteFunctions, itemIndex: number): ChatMessage[] {
	const promptMode = executeFunctions.getNodeParameter(
		'promptMode',
		itemIndex,
		'systemUser',
	) as string;

	if (promptMode === 'single') {
		const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex) as string;

		return [
			{
				role: 'user',
				content: validateNonEmptyText(executeFunctions, singlePrompt, 'Prompt'),
			},
		];
	}

	if (promptMode === 'messagesJson') {
		const messagesJson = executeFunctions.getNodeParameter('messagesJson', itemIndex) as unknown;

		return validateMessagesJson(executeFunctions, messagesJson);
	}

	const prompt = executeFunctions.getNodeParameter('prompt', itemIndex) as string;
	const systemMessage = executeFunctions.getNodeParameter('systemMessage', itemIndex, '') as string;
	const messages: ChatMessage[] = [];

	if (systemMessage.trim() !== '') {
		messages.push({
			role: 'system',
			content: systemMessage,
		});
	}

	messages.push({
		role: 'user',
		content: validateNonEmptyText(executeFunctions, prompt, 'User Prompt'),
	});

	return messages;
}

function validateMessagesJson(executeFunctions: IExecuteFunctions, value: unknown): ChatMessage[] {
	let parsedValue = value;

	if (typeof value === 'string') {
		try {
			parsedValue = JSON.parse(value);
		} catch {
			throw new NodeOperationError(executeFunctions.getNode(), 'Messages JSON must be valid JSON.');
		}
	}

	if (!Array.isArray(parsedValue)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Messages JSON must resolve to an array.',
		);
	}

	if (parsedValue.length === 0) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Messages JSON must contain at least one message.',
		);
	}

	return parsedValue.map((message, index) => validateMessage(executeFunctions, message, index));
}

function validateMessage(
	executeFunctions: IExecuteFunctions,
	message: unknown,
	index: number,
): ChatMessage {
	const messageNumber = index + 1;

	if (message === null || typeof message !== 'object' || Array.isArray(message)) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Message ${messageNumber} must be an object.`,
		);
	}

	const candidate = message as IDataObject;
	const role = candidate.role;

	if (
		typeof role !== 'string' ||
		!VALID_MESSAGE_ROLES.includes(role as (typeof VALID_MESSAGE_ROLES)[number])
	) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Message ${messageNumber} role must be one of system, user, assistant.`,
		);
	}

	return {
		role: role as ChatMessage['role'],
		content: validateNonEmptyText(
			executeFunctions,
			candidate.content,
			`Message ${messageNumber} content`,
		),
	};
}
