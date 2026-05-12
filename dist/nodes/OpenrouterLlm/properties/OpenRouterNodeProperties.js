"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeParameterSurface = void 0;
const generationProperties_1 = require("./generationProperties");
const integrationProperties_1 = require("./integrationProperties");
const modelProperties_1 = require("./modelProperties");
const promptProperties_1 = require("./promptProperties");
const providerRoutingProperties_1 = require("./providerRoutingProperties");
const structuredOutputProperties_1 = require("./structuredOutputProperties");
const structuredOutputRepairProperties_1 = require("./structuredOutputRepairProperties");
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