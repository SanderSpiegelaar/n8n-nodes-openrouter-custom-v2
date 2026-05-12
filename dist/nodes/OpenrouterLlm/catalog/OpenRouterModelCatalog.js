"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchOpenRouterModelCatalog = searchOpenRouterModelCatalog;
exports.loadOpenRouterModelCatalogOptions = loadOpenRouterModelCatalogOptions;
const OpenRouterHeaders_1 = require("../execution/OpenRouterHeaders");
const OPENROUTER_CUSTOM_CREDENTIAL_NAME = 'openRouterCustomV2Api';
async function searchOpenRouterModelCatalog(filter) {
    var _a;
    const normalizedFilter = (_a = filter === null || filter === void 0 ? void 0 : filter.toLowerCase()) !== null && _a !== void 0 ? _a : '';
    const models = await loadOpenRouterModelCatalog.call(this);
    const results = models
        .filter((model) => modelMatchesFilter(model, normalizedFilter))
        .map(toModelOption)
        .sort((a, b) => a.value.toString().localeCompare(b.value.toString()));
    return { results };
}
async function loadOpenRouterModelCatalogOptions() {
    const models = await loadOpenRouterModelCatalog.call(this);
    return models.map(toModelOption).sort((a, b) => a.value.toString().localeCompare(b.value.toString()));
}
async function loadOpenRouterModelCatalog() {
    var _a;
    const credentials = await this.getCredentials(OPENROUTER_CUSTOM_CREDENTIAL_NAME);
    const creds = credentials;
    const baseUrl = creds.baseUrl.replace(/\/+$/, '');
    const headers = (0, OpenRouterHeaders_1.mergeOpenRouterAuthenticatedHeaders)(creds, {});
    const response = (await this.helpers.httpRequest.call(this, {
        method: 'GET',
        baseURL: baseUrl,
        url: '/models',
        headers,
        json: true,
    }));
    return ((_a = response.data) !== null && _a !== void 0 ? _a : []).filter(isSelectableTextModel);
}
function modelMatchesFilter(model, normalizedFilter) {
    var _a;
    if (normalizedFilter === '') {
        return true;
    }
    return (model.id.toLowerCase().includes(normalizedFilter) ||
        ((_a = model.name) !== null && _a !== void 0 ? _a : '').toLowerCase().includes(normalizedFilter));
}
function toModelOption(model) {
    return {
        name: model.id,
        value: model.id,
    };
}
function isSelectableTextModel(model) {
    return isTextModel(model) && model.id !== 'openrouter/auto';
}
function isTextModel(model) {
    var _a;
    const outputModalities = (_a = model.architecture) === null || _a === void 0 ? void 0 : _a.output_modalities;
    return outputModalities === undefined || outputModalities.includes('text');
}
//# sourceMappingURL=OpenRouterModelCatalog.js.map