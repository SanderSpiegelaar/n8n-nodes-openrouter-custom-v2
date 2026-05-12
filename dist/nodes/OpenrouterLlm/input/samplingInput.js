"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSamplingInput = buildSamplingInput;
const validation_1 = require("./validation");
function buildSamplingInput(executeFunctions, itemIndex) {
    const generation = executeFunctions.getNodeParameter('generation', itemIndex, {});
    const advancedSampling = executeFunctions.getNodeParameter('advancedSampling', itemIndex, {});
    return {
        temperature: (0, validation_1.isUnset)(generation.temperature) ? undefined : generation.temperature,
        maxTokens: (0, validation_1.isUnset)(generation.maxTokens)
            ? undefined
            : (0, validation_1.validatePositiveNumber)(executeFunctions, generation.maxTokens, 'Max Tokens'),
        topP: (0, validation_1.isUnset)(generation.topP) ? undefined : generation.topP,
        frequencyPenalty: (0, validation_1.isUnset)(generation.frequencyPenalty)
            ? undefined
            : generation.frequencyPenalty,
        presencePenalty: (0, validation_1.isUnset)(generation.presencePenalty)
            ? undefined
            : generation.presencePenalty,
        promptCacheKey: (0, validation_1.isUnset)(generation.promptCacheKey)
            ? undefined
            : (0, validation_1.validateNonEmptyText)(executeFunctions, generation.promptCacheKey, 'Prompt Cache Key'),
        seed: (0, validation_1.isUnset)(generation.seed) ? undefined : generation.seed,
        stop: (0, validation_1.isUnset)(generation.stop) ? undefined : generation.stop,
        topK: (0, validation_1.isUnset)(advancedSampling.topK)
            ? undefined
            : (0, validation_1.validatePositiveNumber)(executeFunctions, advancedSampling.topK, 'Top K'),
        repetitionPenalty: (0, validation_1.isUnset)(advancedSampling.repetitionPenalty)
            ? undefined
            : (0, validation_1.validatePositiveNumber)(executeFunctions, advancedSampling.repetitionPenalty, 'Repetition Penalty'),
        minP: (0, validation_1.isUnset)(advancedSampling.minP)
            ? undefined
            : (0, validation_1.validateRange)(executeFunctions, advancedSampling.minP, 'Min P'),
        topA: (0, validation_1.isUnset)(advancedSampling.topA)
            ? undefined
            : (0, validation_1.validateRange)(executeFunctions, advancedSampling.topA, 'Top A'),
        transforms: Array.isArray(advancedSampling.transforms) && advancedSampling.transforms.length > 0
            ? advancedSampling.transforms
            : undefined,
    };
}
//# sourceMappingURL=samplingInput.js.map