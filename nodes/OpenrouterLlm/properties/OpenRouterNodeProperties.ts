import type { INodeProperties } from 'n8n-workflow';

import { generationProperties } from './generationProperties';
import { integrationProperties } from './integrationProperties';
import { modelProperties } from './modelProperties';
import { promptProperties } from './promptProperties';
import { providerRoutingProperties } from './providerRoutingProperties';
import { structuredOutputProperties } from './structuredOutputProperties';
import { structuredOutputRepairProperties } from './structuredOutputRepairProperties';

export const nodeParameterSurface: INodeProperties[] = [
	...modelProperties,
	...promptProperties,
	...generationProperties,
	...integrationProperties,
	...providerRoutingProperties,
	...structuredOutputProperties,
	...structuredOutputRepairProperties,
];
