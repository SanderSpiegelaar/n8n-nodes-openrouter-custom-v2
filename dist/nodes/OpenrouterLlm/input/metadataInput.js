"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMetadataExtras = buildMetadataExtras;
exports.buildMetadata = buildMetadata;
const n8n_workflow_1 = require("n8n-workflow");
const OpenRouterRouting_1 = require("../routing/OpenRouterRouting");
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
//# sourceMappingURL=metadataInput.js.map