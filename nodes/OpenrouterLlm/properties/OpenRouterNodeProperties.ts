import type { INodeProperties } from 'n8n-workflow';

import {
	advancedSamplingProperties,
	generationProperties,
	reasoningProperties,
} from './generationProperties';
import { integrationProperties } from './integrationProperties';
import { modelProperties } from './modelProperties';
import { outputProperties } from './outputProperties';
import { promptProperties } from './promptProperties';
import { providerRoutingProperties } from './providerRoutingProperties';
import { structuredOutputProperties } from './structuredOutputProperties';
import { structuredOutputRepairProperties } from './structuredOutputRepairProperties';

export const nodeParameterSurface: INodeProperties[] = [
	...promptProperties,
	...modelProperties,
	...reasoningProperties,
	...structuredOutputProperties,
	...outputProperties,
	...structuredOutputRepairProperties,
	...providerRoutingProperties,
	...integrationProperties,
	...generationProperties,
	...advancedSamplingProperties,
];
