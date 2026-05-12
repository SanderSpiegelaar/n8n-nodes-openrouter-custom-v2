"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const OpenRouterModelCatalog_1 = require("./catalog/OpenRouterModelCatalog");
const OpenRouterExecution_1 = require("./execution/OpenRouterExecution");
const OpenRouterExecutionInputBuilder_1 = require("./execution/OpenRouterExecutionInputBuilder");
const OpenRouterRouting_1 = require("./routing/OpenRouterRouting");
const OpenRouterNodeProperties_1 = require("./properties/OpenRouterNodeProperties");
const StructuredOutputNodeAdapter_1 = require("./structured-output/StructuredOutputNodeAdapter");
const OpenRouterHeaders_1 = require("./execution/OpenRouterHeaders");
const OPENROUTER_CUSTOM_CREDENTIAL_NAME = 'openRouterCustomV2Api';
class OpenrouterLlm {
    constructor() {
        this.description = {
            displayName: 'Openrouter LLM',
            name: 'openrouterLlm',
            icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["model"]}}',
            description: 'Send prompts to OpenRouter chat completion models',
            defaults: {
                name: 'Openrouter LLM',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            credentials: [
                {
                    name: OPENROUTER_CUSTOM_CREDENTIAL_NAME,
                    required: true,
                },
            ],
            properties: OpenRouterNodeProperties_1.nodeParameterSurface,
        };
        this.methods = {
            listSearch: {
                getOpenRouterModels: OpenRouterModelCatalog_1.searchOpenRouterModelCatalog,
            },
            loadOptions: {
                getOpenRouterModelOptions: OpenRouterModelCatalog_1.loadOpenRouterModelCatalogOptions,
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const data = await executeItem(this, itemIndex);
                returnData.push(toN8nOutputItem(this, data, itemIndex));
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push(toContinueOnFailOutputItem(error, itemIndex));
                    continue;
                }
                rethrowAsN8nError(this, error, itemIndex);
            }
        }
        return [returnData];
    }
}
exports.OpenrouterLlm = OpenrouterLlm;
async function executeItem(executeFunctions, itemIndex) {
    const credentials = await executeFunctions.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    const modelVariant = (0, OpenRouterRouting_1.getSelectedModelVariant)(executeFunctions, itemIndex);
    const outputMode = executeFunctions.getNodeParameter('outputMode', itemIndex, 'text');
    const maxRepairAttempts = outputMode === 'text'
        ? 0
        : executeFunctions.getNodeParameter('maxValidationAttempts', itemIndex, 2);
    const compiledSchema = outputMode === 'json_schema' ? (0, StructuredOutputNodeAdapter_1.compileSchema)(executeFunctions, itemIndex) : undefined;
    const provider = (0, OpenRouterRouting_1.buildProvider)(executeFunctions, itemIndex, outputMode);
    const webPluginEnabled = (0, OpenRouterExecutionInputBuilder_1.buildWebPlugin)(executeFunctions, itemIndex) !== undefined;
    (0, OpenRouterRouting_1.validateRouting)(executeFunctions, modelVariant, provider, webPluginEnabled);
    const headers = (0, OpenRouterHeaders_1.buildOpenRouterHeaders)(executeFunctions, itemIndex);
    const executionResult = await (0, OpenRouterExecution_1.executeOpenRouter)({
        input: (0, OpenRouterExecutionInputBuilder_1.buildOpenRouterExecutionInput)(executeFunctions, itemIndex, provider, outputMode, compiledSchema, maxRepairAttempts),
        sendChat: createOpenRouterChatSender(executeFunctions, baseUrl, headers, credentials, itemIndex),
    });
    if (executionResult.kind !== 'success') {
        throw (0, StructuredOutputNodeAdapter_1.buildStructuredOutputError)(executeFunctions, itemIndex, 1 + executionResult.error.repairAttempts, {
            errors: executionResult.error.validationErrors,
            details: executionResult.error.validationDetails,
            originalRawText: executionResult.error.originalRawText,
            latestRepairText: executionResult.error.latestRepairText,
        });
    }
    return executionResult.data;
}
function createOpenRouterChatSender(executeFunctions, baseUrl, headers, credentials, itemIndex) {
    return async (body) => {
        var _a, _b, _c, _d;
        const normalizedKey = (0, OpenRouterHeaders_1.normalizeOpenRouterApiKey)(credentials.apiKey);
        if (normalizedKey === '') {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'OpenRouter API key is missing or empty.', {
                itemIndex,
            });
        }
        const mergedHeaders = (0, OpenRouterHeaders_1.mergeOpenRouterAuthenticatedHeaders)(credentials, headers);
        let response;
        try {
            response = (await executeFunctions.helpers.httpRequest.call(executeFunctions, {
                method: 'POST',
                baseURL: baseUrl,
                url: '/chat/completions',
                headers: mergedHeaders,
                json: true,
                body,
            }));
        }
        catch (unknownError) {
            throw toOpenRouterRequestError(executeFunctions, unknownError, itemIndex);
        }
        return {
            response,
            text: (_d = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : '',
        };
    };
}
function toOpenRouterRequestError(executeFunctions, error, itemIndex) {
    if (error instanceof n8n_workflow_1.NodeApiError) {
        return error;
    }
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
        return new n8n_workflow_1.NodeApiError(executeFunctions.getNode(), error, { itemIndex });
    }
    return new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), error instanceof Error ? error.message : String(error), { itemIndex });
}
function toN8nOutputItem(executeFunctions, data, itemIndex) {
    var _a;
    const outputOptions = executeFunctions.getNodeParameter('outputOptions', itemIndex, {});
    const json = {
        output: (_a = data.structured) !== null && _a !== void 0 ? _a : data.text,
    };
    if (outputOptions.includeResponseDetails === true) {
        json.response = data.response;
        if (data.structuredOutputRepair !== undefined) {
            json.structuredOutputRepair = data.structuredOutputRepair;
        }
    }
    return {
        json,
        pairedItem: { item: itemIndex },
    };
}
function toContinueOnFailOutputItem(error, itemIndex) {
    const diagnosticFields = (0, StructuredOutputNodeAdapter_1.getStructuredOutputDiagnosticFields)(error);
    return {
        json: {
            error: error instanceof Error ? error.message : String(error),
            ...diagnosticFields,
        },
        pairedItem: { item: itemIndex },
    };
}
function rethrowAsN8nError(executeFunctions, error, itemIndex) {
    var _a;
    if (error instanceof n8n_workflow_1.NodeOperationError) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), error.message, {
            itemIndex,
            description: (_a = error.description) !== null && _a !== void 0 ? _a : undefined,
        });
    }
    if (error instanceof n8n_workflow_1.NodeApiError) {
        throw error;
    }
    const looksLikeForeignNodeApiError = error instanceof Error &&
        error.name === 'NodeApiError' &&
        Object.prototype.hasOwnProperty.call(error, 'httpCode');
    if (looksLikeForeignNodeApiError) {
        throw error;
    }
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
        const axiosish = error;
        if (axiosish.isAxiosError === true) {
            throw new n8n_workflow_1.NodeApiError(executeFunctions.getNode(), axiosish, {
                itemIndex,
            });
        }
    }
    throw new n8n_workflow_1.NodeApiError(executeFunctions.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex });
}
//# sourceMappingURL=OpenrouterLlm.node.js.map