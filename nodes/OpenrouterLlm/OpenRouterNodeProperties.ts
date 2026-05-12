import type { INodeProperties } from 'n8n-workflow';

import { generationProperties } from './properties/generationProperties';
import { integrationProperties } from './properties/integrationProperties';
import { modelProperties } from './properties/modelProperties';
import { promptProperties } from './properties/promptProperties';
import { providerRoutingProperties } from './properties/providerRoutingProperties';
import { structuredOutputProperties } from './properties/structuredOutputProperties';
import { structuredOutputRepairProperties } from './properties/structuredOutputRepairProperties';

export const nodeParameterSurface: INodeProperties[] = [
	...modelProperties,
	...promptProperties,
	...generationProperties,
	...integrationProperties,
	...providerRoutingProperties,
	...structuredOutputProperties,
	...structuredOutputRepairProperties,
];
