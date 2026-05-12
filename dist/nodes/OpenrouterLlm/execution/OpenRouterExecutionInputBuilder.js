"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWebPlugin = void 0;
exports.buildOpenRouterExecutionInput = buildOpenRouterExecutionInput;
const OpenRouterRouting_1 = require("../routing/OpenRouterRouting");
const messageInput_1 = require("../input/messageInput");
const metadataInput_1 = require("../input/metadataInput");
const pluginInput_1 = require("../input/pluginInput");
Object.defineProperty(exports, "buildWebPlugin", { enumerable: true, get: function () { return pluginInput_1.buildWebPlugin; } });
const reasoningInput_1 = require("../input/reasoningInput");
const samplingInput_1 = require("../input/samplingInput");
const structuredOutputInput_1 = require("../input/structuredOutputInput");
function buildOpenRouterExecutionInput(executeFunctions, itemIndex, provider, outputMode, compiledSchema, maxRepairAttempts) {
    var _a, _b, _c;
    const workflow = executeFunctions.getWorkflow();
    const reasoningParameters = executeFunctions.getNodeParameter('reasoning', itemIndex, {});
    const reasoning = (0, reasoningInput_1.buildReasoning)(executeFunctions, reasoningParameters);
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const sessionId = (_a = integrations.sessionId) !== null && _a !== void 0 ? _a : '';
    const primaryModel = (0, OpenRouterRouting_1.resolvePrimaryModel)(executeFunctions, itemIndex);
    return {
        modelRouting: {
            primaryModel,
            fallbackModels: (0, OpenRouterRouting_1.resolveFallbackModels)(executeFunctions, itemIndex),
        },
        messages: (0, messageInput_1.buildMessages)(executeFunctions, itemIndex),
        outputMode,
        sampling: (0, samplingInput_1.buildSamplingInput)(executeFunctions, itemIndex),
        metadata: {
            defaults: {
                executionId: executeFunctions.getExecutionId(),
                workflowId: (_b = workflow.id) !== null && _b !== void 0 ? _b : '',
                workflowName: (_c = workflow.name) !== null && _c !== void 0 ? _c : '',
                nodeName: executeFunctions.getNode().name,
                itemIndex,
            },
            extras: (0, metadataInput_1.buildMetadataExtras)(executeFunctions, itemIndex),
        },
        provider: provider,
        plugins: (0, pluginInput_1.buildPlugins)(executeFunctions, itemIndex),
        sessionId,
        reasoning: {
            request: reasoning,
            excludeFromResponse: reasoningParameters.exclude === true,
        },
        structuredOutput: (0, structuredOutputInput_1.buildStructuredOutputExecutionConfig)(executeFunctions, itemIndex, outputMode, compiledSchema, maxRepairAttempts),
    };
}
//# sourceMappingURL=OpenRouterExecutionInputBuilder.js.map