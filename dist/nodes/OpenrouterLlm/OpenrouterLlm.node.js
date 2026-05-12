"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenrouterLlm = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const OpenRouterModelCatalog_1 = require("./OpenRouterModelCatalog");
const OpenRouterExecution_1 = require("./OpenRouterExecution");
const OpenRouterExecutionInputBuilder_1 = require("./OpenRouterExecutionInputBuilder");
const OpenRouterRouting_1 = require("./OpenRouterRouting");
const OpenRouterNodeProperties_1 = require("./OpenRouterNodeProperties");
const StructuredOutputNodeAdapter_1 = require("./StructuredOutputNodeAdapter");
const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'];
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
        var _a;
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
                const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
                const modelVariant = (0, OpenRouterRouting_1.getSelectedModelVariant)(this, itemIndex);
                const outputMode = this.getNodeParameter('outputMode', itemIndex, 'text');
                const maxRepairAttempts = outputMode === 'text'
                    ? 0
                    : this.getNodeParameter('maxValidationAttempts', itemIndex, 2);
                const compiledSchema = outputMode === 'json_schema' ? (0, StructuredOutputNodeAdapter_1.compileSchema)(this, itemIndex) : undefined;
                const provider = (0, OpenRouterRouting_1.buildProvider)(this, itemIndex, outputMode);
                const webPluginEnabled = (0, OpenRouterExecutionInputBuilder_1.buildWebPlugin)(this, itemIndex) !== undefined;
                (0, OpenRouterRouting_1.validateRouting)(this, modelVariant, provider, webPluginEnabled);
                const headers = buildHeaders(this, itemIndex);
                {
                    const executionResult = await (0, OpenRouterExecution_1.executeOpenRouter)({
                        input: (0, OpenRouterExecutionInputBuilder_1.buildOpenRouterExecutionInput)(this, itemIndex, provider, outputMode, compiledSchema, maxRepairAttempts),
                        sendChat: async (body) => {
                            var _a, _b, _c, _d;
                            const response = (await this.helpers.httpRequestWithAuthentication.call(this, OPENROUTER_CUSTOM_CREDENTIAL_NAME, {
                                method: 'POST',
                                baseURL: baseUrl,
                                url: '/chat/completions',
                                headers,
                                json: true,
                                body,
                            }));
                            return {
                                response,
                                text: (_d = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : '',
                            };
                        },
                    });
                    if (executionResult.kind !== 'success') {
                        throw (0, StructuredOutputNodeAdapter_1.buildStructuredOutputError)(this, itemIndex, 1 + executionResult.error.repairAttempts, {
                            errors: executionResult.error.validationErrors,
                            details: executionResult.error.validationDetails,
                            originalRawText: executionResult.error.originalRawText,
                            latestRepairText: executionResult.error.latestRepairText,
                        });
                    }
                    returnData.push({
                        json: executionResult.data,
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const diagnosticFields = (0, StructuredOutputNodeAdapter_1.getStructuredOutputDiagnosticFields)(error);
                    returnData.push({
                        json: {
                            error: error instanceof Error ? error.message : String(error),
                            ...diagnosticFields,
                        },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeOperationError) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error.message, {
                        itemIndex,
                        description: (_a = error.description) !== null && _a !== void 0 ? _a : undefined,
                    });
                }
                throw new n8n_workflow_1.NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.OpenrouterLlm = OpenrouterLlm;
function buildHeaders(executeFunctions, itemIndex) {
    var _a, _b, _c, _d, _e;
    const headers = {};
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    const langfuseTrace = (_a = integrations.langfuseTrace) !== null && _a !== void 0 ? _a : true;
    const customHeaders = (_b = integrations.headers) !== null && _b !== void 0 ? _b : {};
    if (langfuseTrace) {
        headers['langfuse-trace-id'] = executeFunctions.getExecutionId();
    }
    for (const header of (_c = customHeaders.values) !== null && _c !== void 0 ? _c : []) {
        const name = (_d = header.name) !== null && _d !== void 0 ? _d : '';
        if (name.trim() === '') {
            continue;
        }
        if (PROTECTED_HEADERS.includes(name.toLowerCase())) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `${name} is a protected header.`);
        }
        headers[name] = (_e = header.value) !== null && _e !== void 0 ? _e : '';
    }
    return headers;
}
//# sourceMappingURL=OpenrouterLlm.node.js.map