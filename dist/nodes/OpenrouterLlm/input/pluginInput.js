"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlugins = buildPlugins;
exports.buildWebPlugin = buildWebPlugin;
const validation_1 = require("./validation");
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
function buildWebPlugin(executeFunctions, itemIndex) {
    const integrations = executeFunctions.getNodeParameter('integrations', itemIndex, {});
    if (integrations.webEnabled !== true) {
        return undefined;
    }
    const plugin = { id: 'web' };
    if (!(0, validation_1.isUnset)(integrations.webMaxResults)) {
        plugin.max_results = (0, validation_1.validatePositiveNumber)(executeFunctions, integrations.webMaxResults, 'Web Search Max Results');
    }
    if (typeof integrations.webSearchPrompt === 'string' &&
        integrations.webSearchPrompt.trim() !== '') {
        plugin.search_prompt = integrations.webSearchPrompt;
    }
    return plugin;
}
//# sourceMappingURL=pluginInput.js.map