"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePrimaryModel = resolvePrimaryModel;
exports.getSelectedModelVariant = getSelectedModelVariant;
exports.resolveModelLocator = resolveModelLocator;
exports.resolveFallbackModels = resolveFallbackModels;
exports.stripSupportedVariant = stripSupportedVariant;
exports.buildProvider = buildProvider;
exports.validateRouting = validateRouting;
const n8n_workflow_1 = require("n8n-workflow");
const SUPPORTED_MODEL_VARIANTS = [
    ':exacto',
    ':extended',
    ':floor',
    ':free',
    ':nitro',
    ':online',
];
function resolvePrimaryModel(executeFunctions, itemIndex) {
    const modelParameter = executeFunctions.getNodeParameter('model', itemIndex);
    const modelId = resolveModelLocator(modelParameter, '');
    const modelVariant = getSelectedModelVariant(executeFunctions, itemIndex);
    if (modelId.trim() === '') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model ID must not be empty.');
    }
    if (modelVariant === '') {
        return modelId;
    }
    if (!isSupportedModelVariant(modelVariant)) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Unsupported model variant selected.');
    }
    return `${stripSupportedVariant(modelId)}${modelVariant}`;
}
function getSelectedModelVariant(executeFunctions, itemIndex) {
    var _a;
    const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {});
    return (_a = modelOptions.modelVariant) !== null && _a !== void 0 ? _a : '';
}
function resolveModelLocator(modelParameter, defaultModel) {
    var _a;
    if (modelParameter === undefined) {
        return defaultModel;
    }
    return typeof modelParameter === 'string'
        ? modelParameter
        : ((_a = modelParameter.value) !== null && _a !== void 0 ? _a : defaultModel).toString();
}
function resolveFallbackModels(executeFunctions, itemIndex) {
    var _a, _b;
    const modelOptions = executeFunctions.getNodeParameter('modelOptions', itemIndex, {});
    const fallbackModels = (_a = modelOptions.fallbackModels) !== null && _a !== void 0 ? _a : {};
    return ((_b = fallbackModels.values) !== null && _b !== void 0 ? _b : [])
        .map((fallback) => { var _a, _b; return (_b = (_a = fallback.model) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; })
        .filter((model) => model !== '');
}
function stripSupportedVariant(modelId) {
    const supportedVariant = SUPPORTED_MODEL_VARIANTS.find((variant) => modelId.endsWith(variant));
    if (!supportedVariant) {
        return modelId;
    }
    return modelId.slice(0, -supportedVariant.length);
}
function buildProvider(executeFunctions, itemIndex, outputMode = 'text') {
    var _a, _b, _c;
    const provider = {};
    const routing = executeFunctions.getNodeParameter('providerRouting', itemIndex, {});
    const allow = collectProviderNamesFromCollection(routing.allow);
    const deny = collectProviderNamesFromCollection(routing.deny);
    const sort = (_a = routing.sort) !== null && _a !== void 0 ? _a : '';
    const allowFallbacks = (_b = routing.allowFallbacks) !== null && _b !== void 0 ? _b : '';
    const requireParameters = (_c = routing.requireParameters) !== null && _c !== void 0 ? _c : '';
    if (allow.length > 0) {
        provider.only = allow;
    }
    if (deny.length > 0) {
        provider.ignore = deny;
    }
    if (sort !== '') {
        provider.sort = sort;
    }
    if (allowFallbacks === 'true' || allowFallbacks === 'false') {
        provider.allow_fallbacks = allowFallbacks === 'true';
    }
    if (requireParameters === 'true' || requireParameters === 'false') {
        provider.require_parameters = requireParameters === 'true';
    }
    else if (outputMode === 'json_schema') {
        provider.require_parameters = true;
    }
    return Object.keys(provider).length === 0 ? undefined : provider;
}
function validateRouting(executeFunctions, modelVariant, provider, webPluginEnabled = false) {
    if (webPluginEnabled && modelVariant === ':online') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :online conflicts with the Web Search Plugin. Disable one of the two — both routes inject web search results.');
    }
    if (provider === undefined) {
        return;
    }
    if (provider.sort !== undefined && modelVariant === ':nitro') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :nitro conflicts with Provider Sort. Remove one of the two — :nitro already requests throughput routing.');
    }
    if (provider.sort !== undefined && modelVariant === ':floor') {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Model Variant :floor conflicts with Provider Sort. Remove one of the two — :floor already requests price routing.');
    }
    const allow = Array.isArray(provider.only) ? provider.only : [];
    const deny = Array.isArray(provider.ignore) ? provider.ignore : [];
    if (allow.length > 0 && deny.length > 0) {
        const denyNormalized = new Set(deny.map((name) => name.trim().toLowerCase()));
        const conflict = allow.find((name) => denyNormalized.has(name.trim().toLowerCase()));
        if (conflict !== undefined) {
            throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Provider "${conflict}" appears in both Allow Providers and Deny Providers. Remove it from one list.`);
        }
    }
}
function collectProviderNamesFromCollection(collection) {
    var _a;
    return ((_a = (collection !== null && collection !== void 0 ? collection : {}).values) !== null && _a !== void 0 ? _a : [])
        .map((row) => { var _a, _b; return (_b = (_a = row.name) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; })
        .filter((name) => name !== '');
}
function isSupportedModelVariant(modelVariant) {
    return SUPPORTED_MODEL_VARIANTS.includes(modelVariant);
}
//# sourceMappingURL=OpenRouterRouting.js.map