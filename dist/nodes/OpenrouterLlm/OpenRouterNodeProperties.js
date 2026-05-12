"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeParameterSurface = void 0;
const generationProperties_1 = require("./properties/generationProperties");
const integrationProperties_1 = require("./properties/integrationProperties");
const modelProperties_1 = require("./properties/modelProperties");
const promptProperties_1 = require("./properties/promptProperties");
const providerRoutingProperties_1 = require("./properties/providerRoutingProperties");
const structuredOutputProperties_1 = require("./properties/structuredOutputProperties");
const structuredOutputRepairProperties_1 = require("./properties/structuredOutputRepairProperties");
exports.nodeParameterSurface = [
    ...modelProperties_1.modelProperties,
    ...promptProperties_1.promptProperties,
    ...generationProperties_1.generationProperties,
    ...integrationProperties_1.integrationProperties,
    ...providerRoutingProperties_1.providerRoutingProperties,
    ...structuredOutputProperties_1.structuredOutputProperties,
    ...structuredOutputRepairProperties_1.structuredOutputRepairProperties,
];
//# sourceMappingURL=OpenRouterNodeProperties.js.map