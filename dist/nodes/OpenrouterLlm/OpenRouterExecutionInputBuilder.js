"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOpenRouterExecutionInput = buildOpenRouterExecutionInput;
exports.buildWebPlugin = buildWebPlugin;
const n8n_workflow_1 = require("n8n-workflow");
const StructuredOutputParser_1 = require("./StructuredOutputParser");
const OpenRouterRouting_1 = require("./OpenRouterRouting");
const VALID_MESSAGE_ROLES = ['system', 'user', 'assistant'];
function buildOpenRouterExecutionInput(executeFunctions, itemIndex, provider, outputMode, compiledSchema, maxRepairAttempts) {
    var _a, _b, _c;
    const workflow = executeFunctions.getWorkflow();
    const reasoning = buildReasoning(executeFunctions, executeFunctions.getNodeParameter('reasoning', itemIndex, {}));
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const sessionId = (_a = integrations.sessionId) !== null && _a !== void 0 ? _a : '';
    const primaryModel = (0, OpenRouterRouting_1.resolvePrimaryModel)(executeFunctions, itemIndex);
    return {
        modelRouting: {
            primaryModel,
            fallbackModels: (0, OpenRouterRouting_1.resolveFallbackModels)(executeFunctions, itemIndex),
        },
        messages: buildMessages(executeFunctions, itemIndex),
        outputMode,
        sampling: buildSamplingInput(executeFunctions, itemIndex),
        metadata: {
            defaults: {
                executionId: executeFunctions.getExecutionId(),
                workflowId: (_b = workflow.id) !== null && _b !== void 0 ? _b : '',
                workflowName: (_c = workflow.name) !== null && _c !== void 0 ? _c : '',
                nodeName: executeFunctions.getNode().name,
                itemIndex,
            },
            extras: buildMetadataExtras(executeFunctions, itemIndex),
        },
        provider: provider,
        plugins: buildPlugins(executeFunctions, itemIndex),
        sessionId,
        reasoning: {
            request: reasoning,
            excludeFromResponse: executeFunctions.getNodeParameter('reasoning', itemIndex, {}).exclude === true,
        },
        structuredOutput: buildStructuredOutputExecutionConfig(executeFunctions, itemIndex, outputMode, compiledSchema, maxRepairAttempts),
    };
}
function buildStructuredOutputExecutionConfig(executeFunctions, itemIndex, outputMode, compiledSchema, maxRepairAttempts) {
    var _a;
    if (outputMode === 'text') {
        return undefined;
    }
    const repair = executeFunctions.getNodeParameter('repair', itemIndex, {});
    const repairModel = (0, OpenRouterRouting_1.resolveModelLocator)(repair.model, StructuredOutputParser_1.DEFAULT_REPAIR_MODEL);
    return {
        mode: outputMode,
        compiledValidator: compiledSchema === null || compiledSchema === void 0 ? void 0 : compiledSchema.validator,
        responseFormat: compiledSchema === null || compiledSchema === void 0 ? void 0 : compiledSchema.responseFormat,
        repair: {
            maxAttempts: maxRepairAttempts,
            model: repairModel,
            temperature: isUnset(repair.temperature)
                ? StructuredOutputParser_1.DEFAULT_REPAIR_TEMPERATURE
                : repair.temperature,
            reasoningEffort: (_a = repair.reasoningEffort) !== null && _a !== void 0 ? _a : StructuredOutputParser_1.DEFAULT_REPAIR_REASONING_EFFORT,
            promptTemplate: repair.promptTemplate,
            metadata: (attempt, model) => buildMetadata(executeFunctions, itemIndex, model, attempt),
        },
    };
}
function buildSamplingInput(executeFunctions, itemIndex) {
    const generation = executeFunctions.getNodeParameter('generation', itemIndex, {});
    const advancedSampling = executeFunctions.getNodeParameter('advancedSampling', itemIndex, {});
    return {
        temperature: isUnset(generation.temperature) ? undefined : generation.temperature,
        maxTokens: isUnset(generation.maxTokens)
            ? undefined
            : validatePositiveNumber(executeFunctions, generation.maxTokens, 'Max Tokens'),
        topP: isUnset(generation.topP) ? undefined : generation.topP,
        frequencyPenalty: isUnset(generation.frequencyPenalty)
            ? undefined
            : generation.frequencyPenalty,
        presencePenalty: isUnset(generation.presencePenalty)
            ? undefined
            : generation.presencePenalty,
        promptCacheKey: isUnset(generation.promptCacheKey)
            ? undefined
            : validateNonEmptyText(executeFunctions, generation.promptCacheKey, 'Prompt Cache Key'),
        seed: isUnset(generation.seed) ? undefined : generation.seed,
        stop: isUnset(generation.stop) ? undefined : generation.stop,
        topK: isUnset(advancedSampling.topK)
            ? undefined
            : validatePositiveNumber(executeFunctions, advancedSampling.topK, 'Top K'),
        repetitionPenalty: isUnset(advancedSampling.repetitionPenalty)
            ? undefined
            : validatePositiveNumber(executeFunctions, advancedSampling.repetitionPenalty, 'Repetition Penalty'),
        minP: isUnset(advancedSampling.minP)
            ? undefined
            : validateRange(executeFunctions, advancedSampling.minP, 'Min P'),
        topA: isUnset(advancedSampling.topA)
            ? undefined
            : validateRange(executeFunctions, advancedSampling.topA, 'Top A'),
        transforms: Array.isArray(advancedSampling.transforms) && advancedSampling.transforms.length > 0
            ? advancedSampling.transforms
            : undefined,
    };
}
function buildMetadataExtras(executeFunctions, itemIndex) {
    const defaults = buildMetadata(executeFunctions, itemIndex, (0, OpenRouterRouting_1.resolvePrimaryModel)(executeFunctions, itemIndex));
    const extras = { ...defaults };
    const defaultKeys = new Set([
        'execution_id',
        'workflow_id',
        'workflow_name',
        'node_name',
        'item_index',
        'model',
        'validation_attempt',
    ]);
    for (const key of Object.keys(defaults)) {
        if (defaultKeys.has(key)) {
            delete extras[key];
        }
    }
    return extras;
}
function buildPlugins(executeFunctions, itemIndex) {
    var _a;
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const plugins = [];
    if ((_a = integrations.responseHealing) !== null && _a !== void 0 ? _a : false) {
        plugins.push({ id: 'response-healing' });
    }
    const webPlugin = buildWebPlugin(executeFunctions, itemIndex);
    if (webPlugin !== undefined) {
        plugins.push(webPlugin);
    }
    return plugins;
}
function buildMetadata(executeFunctions, itemIndex, model, attempt = 1) {
    var _a, _b, _c, _d, _e, _f;
    const workflow = executeFunctions.getWorkflow();
    const defaultMetadata = {
        execution_id: executeFunctions.getExecutionId(),
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        node_name: executeFunctions.getNode().name,
        item_index: itemIndex,
        model,
        validation_attempt: attempt,
    };
    const metadata = { ...defaultMetadata };
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const extraMetadata = (_a = integrations.metadata) !== null && _a !== void 0 ? _a : {};
    for (const row of (_b = extraMetadata.values) !== null && _b !== void 0 ? _b : []) {
        const key = (_d = (_c = row.key) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
        if (key === '') {
            continue;
        }
        if (Object.prototype.hasOwnProperty.call(defaultMetadata, key)) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${key} conflicts with default metadata.`);
        }
        if (row.valueMode === 'json') {
            try {
                metadata[key] = JSON.parse((_e = row.value) !== null && _e !== void 0 ? _e : '');
            }
            catch {
                throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${key} metadata value must be valid JSON.`);
            }
            continue;
        }
        metadata[key] = (_f = row.value) !== null && _f !== void 0 ? _f : '';
    }
    return metadata;
}
function buildReasoning(executeFunctions, reasoning) {
    var _a, _b;
    const mode = (_a = reasoning.mode) !== null && _a !== void 0 ? _a : 'off';
    const exclude = reasoning.exclude === true;
    if (mode === 'off' && !exclude) {
        return undefined;
    }
    const output = {};
    if (mode === 'effort') {
        output.effort = (_b = reasoning.effort) !== null && _b !== void 0 ? _b : 'medium';
    }
    if (mode === 'tokenBudget') {
        output.max_tokens = validatePositiveNumber(executeFunctions, reasoning.maxTokens, 'Reasoning Max Tokens');
    }
    if (exclude) {
        output.exclude = true;
    }
    return output;
}
function validatePositiveNumber(executeFunctions, value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must be greater than 0.`);
    }
    return numericValue;
}
function validateRange(executeFunctions, value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must be between 0 and 1.`);
    }
    return numericValue;
}
function isUnset(value) {
    return value === undefined || value === null || value === '';
}
function buildMessages(executeFunctions, itemIndex) {
    const promptMode = executeFunctions.getNodeParameter('promptMode', itemIndex, 'systemUser');
    if (promptMode === 'single') {
        const singlePrompt = executeFunctions.getNodeParameter('singlePrompt', itemIndex);
        return [
            {
                role: 'user',
                content: validateNonEmptyText(executeFunctions, singlePrompt, 'Prompt'),
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
        content: validateNonEmptyText(executeFunctions, prompt, 'User Prompt'),
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
        content: validateNonEmptyText(executeFunctions, candidate.content, `Message ${messageNumber} content`),
    };
}
function validateNonEmptyText(executeFunctions, value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${label} must not be empty.`);
    }
    return value;
}
function buildWebPlugin(executeFunctions, itemIndex) {
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    if (integrations.webEnabled !== true) {
        return undefined;
    }
    const plugin = { id: 'web' };
    if (!isUnset(integrations.webMaxResults)) {
        plugin.max_results = validatePositiveNumber(executeFunctions, integrations.webMaxResults, 'Web Search Max Results');
    }
    if (typeof integrations.webSearchPrompt === 'string' &&
        integrations.webSearchPrompt.trim() !== '') {
        plugin.search_prompt = integrations.webSearchPrompt;
    }
    return plugin;
}
//# sourceMappingURL=OpenRouterExecutionInputBuilder.js.map