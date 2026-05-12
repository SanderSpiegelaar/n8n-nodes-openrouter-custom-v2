import type { INodeProperties } from 'n8n-workflow';

import { generationProperties } from './generationProperties';
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
	...structuredOutputProperties,
	...outputProperties,
	...generationProperties,
	...integrationProperties,
	...providerRoutingProperties,
	...structuredOutputRepairProperties,
];
