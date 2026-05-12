"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStructuredOutputExecutionConfig = buildStructuredOutputExecutionConfig;
const StructuredOutputParser_1 = require("../structured-output/StructuredOutputParser");
const OpenRouterRouting_1 = require("../routing/OpenRouterRouting");
const metadataInput_1 = require("./metadataInput");
const validation_1 = require("./validation");
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
            temperature: (0, validation_1.isUnset)(repair.temperature)
                ? StructuredOutputParser_1.DEFAULT_REPAIR_TEMPERATURE
                : repair.temperature,
            reasoningEffort: (_a = repair.reasoningEffort) !== null && _a !== void 0 ? _a : StructuredOutputParser_1.DEFAULT_REPAIR_REASONING_EFFORT,
            promptTemplate: repair.promptTemplate,
            metadata: (attempt, model) => (0, metadataInput_1.buildMetadata)(executeFunctions, itemIndex, model, attempt),
        },
    };
}
//# sourceMappingURL=structuredOutputInput.js.map