"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMessages = buildMessages;
const n8n_workflow_1 = require("n8n-workflow");
const validation_1 = require("./validation");
const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'];
function buildMessages(executeFunctions, itemIndex) {
    const promptMode = executeFunctions.getNodeParameter('promptMode', itemIndex, 'systemUser');
    if (promptMode === 'single') {
        const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex);
        return [
            {
                role: 'user',
                content: (0, validation_1.validateNonEmptyText)(executeFunctions, singlePrompt, 'Prompt'),
            },
        ];
    }
    if (promptMode === 'messagesJson') {
        const messagesJson = executeFunctions.getNodeParameter('messagesJson', itemIndex);
        return validateMessagesJson(executeFunctions, messagesJson);
    }
    const prompt = executeFunctions.getNodeParameter('prompt', itemIndex);
    const systemMessage = executeFunctions.getNodeParameter('systemMessage', itemIndex, '');
    const messages = [];
    if (systemMessage.trim() !== '') {
        messages.push({
            role: 'system',
            content: systemMessage,
        });
    }
    messages.push({
        role: 'user',
        content: (0, validation_1.validateNonEmptyText)(executeFunctions, prompt, 'User Prompt'),
    });
    return messages;
}
function validateMessagesJson(executeFunctions, value) {
    let parsedValue = value;
    if (typeof value === 'string') {
        try {
            parsedValue = JSON.parse(value);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must be valid JSON.');
        }
    }
    if (!Array.isArray(parsedValue)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must resolve to an array.');
    }
    if (parsedValue.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Messages JSON must contain at least one message.');
    }
    return parsedValue.map((message, index) => validateMessage(executeFunctions, message, index));
}
function validateMessage(executeFunctions, message, index) {
    const messageNumber = index + 1;
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Message ${messageNumber} must be an object.`);
    }
    const candidate = message;
    const role = candidate.role;
    if (typeof role !== 'string' ||
        !VALID_MESSAGE_ROLES.includes(role)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Message ${messageNumber} role must be one of system, user, assistant.`);
    }
    return {
        role: role,
        content: (0, validation_1.validateNonEmptyText)(executeFunctions, candidate.content, `Message ${messageNumber} content`),
    };
}
//# sourceMappingURL=messageInput.js.map