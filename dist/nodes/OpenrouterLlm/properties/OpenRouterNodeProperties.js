"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeParameterSurface = void 0;
const generationProperties_1 = require("./generationProperties");
const integrationProperties_1 = require("./integrationProperties");
const modelProperties_1 = require("./modelProperties");
const outputProperties_1 = require("./outputProperties");
const promptProperties_1 = require("./promptProperties");
const providerRoutingProperties_1 = require("./providerRoutingProperties");
const structuredOutputProperties_1 = require("./structuredOutputProperties");
const structuredOutputRepairProperties_1 = require("./structuredOutputRepairProperties");
exports.nodeParameterSurface = [
    ...promptProperties_1.promptProperties,
    ...modelProperties_1.modelProperties,
    ...generationProperties_1.reasoningProperties,
    ...structuredOutputProperties_1.structuredOutputProperties,
    ...outputProperties_1.outputProperties,
    ...structuredOutputRepairProperties_1.structuredOutputRepairProperties,
    ...providerRoutingProperties_1.providerRoutingProperties,
    ...integrationProperties_1.integrationProperties,
    ...generationProperties_1.generationProperties,
    ...generationProperties_1.advancedSamplingProperties,
];
//# sourceMappingURL=OpenRouterNodeProperties.js.map