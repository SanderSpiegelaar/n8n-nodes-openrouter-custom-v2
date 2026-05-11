"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOpenRouter = executeOpenRouter;
exports.buildInitialRequestBody = buildInitialRequestBody;
const StructuredOutputParser_1 = require("./StructuredOutputParser");
async function executeOpenRouter({ input, sendChat, }) {
    var _a;
    const requestBody = buildInitialRequestBody(input, 1);
    const { response, text } = await sendChat(requestBody);
    const finalResponse = applyReasoningExclusion(response, input.reasoning);
    if (input.outputMode === 'text') {
        return {
            kind: 'success',
            data: {
                text,
                structured: null,
                response: finalResponse,
            },
        };
    }
    const structuredOutput = (_a = input.structuredOutput) !== null && _a !== void 0 ? _a : { mode: input.outputMode };
    const structuredOutcome = await (0, StructuredOutputParser_1.evaluateStructuredOutputWithRepair)({
        ...structuredOutput,
        repair: structuredOutput.repair === undefined
            ? undefined
            : {
                ...structuredOutput.repair,
                send: async (body) => sendChat(body),
            },
    }, text, finalResponse);
    if (!structuredOutcome.ok) {
        return {
            kind: 'structured_output',
            error: {
                message: structuredOutcome.error.message,
                validationErrors: structuredOutcome.error.validationErrors,
                validationDetails: structuredOutcome.error.validationDetails,
                originalRawText: structuredOutcome.error.originalRawText,
                latestRepairText: structuredOutcome.error.repair.latestRepairText,
                repairAttempts: structuredOutcome.error.repair.repairAttempts,
            },
        };
    }
    const structuredResponse = applyReasoningExclusion(structuredOutcome.response, input.reasoning);
    const data = {
        text: structuredOutcome.repair.repairAttempts > 0 ? JSON.stringify(structuredOutcome.structured) : structuredOutcome.text,
        structured: structuredOutcome.structured,
        response: structuredResponse,
    };
    if (structuredOutcome.repair.repairAttempts > 0) {
        data.structuredOutputRepair = {
            repaired: true,
            repairAttempts: structuredOutcome.repair.repairAttempts,
        };
    }
    return { kind: 'success', data };
}
function buildInitialRequestBody(input, attempt) {
    var _a, _b;
    const body = {
        ...buildModelPayload(input.modelRouting),
        messages: input.messages,
    };
    const metadata = buildMetadata(input, attempt);
    if (metadata !== undefined) {
        body.metadata = metadata;
    }
    addSampling(body, input.sampling);
    if (input.outputMode === 'json_object') {
        body.response_format = { type: 'json_object' };
    }
    else if (input.outputMode === 'json_schema' && ((_a = input.structuredOutput) === null || _a === void 0 ? void 0 : _a.responseFormat) !== undefined) {
        body.response_format = {
            type: 'json_schema',
            json_schema: input.structuredOutput.responseFormat,
        };
    }
    if (((_b = input.reasoning) === null || _b === void 0 ? void 0 : _b.request) !== undefined) {
        body.reasoning = input.reasoning.request;
    }
    if (input.provider !== undefined) {
        body.provider = input.provider;
    }
    if (input.plugins !== undefined && input.plugins.length > 0) {
        body.plugins = input.plugins;
    }
    if (input.sessionId !== undefined && input.sessionId !== '') {
        body.session_id = input.sessionId;
    }
    return body;
}
function buildModelPayload(modelRouting) {
    var _a;
    const fallbackModels = (_a = modelRouting.fallbackModels) !== null && _a !== void 0 ? _a : [];
    if (fallbackModels.length > 0) {
        return { models: [modelRouting.primaryModel, ...fallbackModels] };
    }
    return { model: modelRouting.primaryModel };
}
function buildMetadata(input, attempt) {
    var _a;
    if (input.metadata === undefined) {
        return undefined;
    }
    return {
        execution_id: input.metadata.defaults.executionId,
        workflow_id: input.metadata.defaults.workflowId,
        workflow_name: input.metadata.defaults.workflowName,
        node_name: input.metadata.defaults.nodeName,
        item_index: input.metadata.defaults.itemIndex,
        model: input.modelRouting.primaryModel,
        validation_attempt: attempt,
        ...((_a = input.metadata.extras) !== null && _a !== void 0 ? _a : {}),
    };
}
function addSampling(body, sampling) {
    if (sampling === undefined) {
        return;
    }
    addIfSet(body, 'temperature', sampling.temperature);
    addIfSet(body, 'max_tokens', sampling.maxTokens);
    addIfSet(body, 'top_p', sampling.topP);
    addIfSet(body, 'frequency_penalty', sampling.frequencyPenalty);
    addIfSet(body, 'presence_penalty', sampling.presencePenalty);
    addIfSet(body, 'prompt_cache_key', sampling.promptCacheKey);
    addIfSet(body, 'seed', sampling.seed);
    addIfSet(body, 'stop', sampling.stop);
    addIfSet(body, 'top_k', sampling.topK);
    addIfSet(body, 'repetition_penalty', sampling.repetitionPenalty);
    addIfSet(body, 'min_p', sampling.minP);
    addIfSet(body, 'top_a', sampling.topA);
    if (sampling.transforms !== undefined && sampling.transforms.length > 0) {
        body.transforms = sampling.transforms;
    }
}
function addIfSet(body, wireName, value) {
    if (value !== undefined && value !== null && value !== '') {
        body[wireName] = value;
    }
}
function applyReasoningExclusion(response, reasoning) {
    if ((reasoning === null || reasoning === void 0 ? void 0 : reasoning.excludeFromResponse) !== true || response.choices === undefined) {
        return response;
    }
    for (const choice of response.choices) {
        if (choice.message !== undefined) {
            delete choice.message.reasoning;
            delete choice.message.reasoning_content;
        }
    }
    return response;
}
//# sourceMappingURL=OpenRouterExecution.js.map