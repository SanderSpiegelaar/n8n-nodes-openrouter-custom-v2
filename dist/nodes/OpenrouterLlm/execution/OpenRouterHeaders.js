"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOpenRouterHeaders = buildOpenRouterHeaders;
exports.mergeOpenRouterAuthenticatedHeaders = mergeOpenRouterAuthenticatedHeaders;
const n8n_workflow_1 = require("n8n-workflow");
const PROTECTED_HEADERS = ['authorization', 'http-referer', 'x-title'];
function buildOpenRouterHeaders(executeFunctions, itemIndex) {
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
function mergeOpenRouterAuthenticatedHeaders(credentials, requestHeaders) {
    const out = { ...requestHeaders };
    const rawKey = credentials.apiKey;
    const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (apiKey !== '') {
        out.Authorization = `Bearer ${apiKey}`;
    }
    const siteUrl = credentials.siteUrl;
    if (typeof siteUrl === 'string' && siteUrl.trim() !== '') {
        out['HTTP-Referer'] = siteUrl.trim();
    }
    const appName = credentials.appName;
    if (typeof appName === 'string' && appName.trim() !== '') {
        out['X-OpenRouter-Title'] = appName.trim();
    }
    return out;
}
//# sourceMappingURL=OpenRouterHeaders.js.map