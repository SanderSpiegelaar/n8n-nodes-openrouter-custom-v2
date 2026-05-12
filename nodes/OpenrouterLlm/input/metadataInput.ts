import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { resolvePrimaryModel } from '../routing/OpenRouterRouting';

export function buildMetadataExtras(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Record<string, unknown> {
	const defaults = buildMetadata(
		executeFunctions,
		itemIndex,
		resolvePrimaryModel(executeFunctions, itemIndex),
	);
	const extras = { ...defaults } as Record<string, unknown>;
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

export function buildMetadata(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	model: string,
	attempt: number = 1,
): IDataObject {
	const workflow = executeFunctions.getWorkflow();
	const defaultMetadata: IDataObject = {
		execution_id: executeFunctions.getExecutionId(),
		workflow_id: workflow.id,
		workflow_name: workflow.name,
		node_name: executeFunctions.getNode().name,
		item_index: itemIndex,
		model,
		validation_attempt: attempt,
	};
	const metadata = { ...defaultMetadata };
	const integrations = executeFunctions.getNodeParameter(
		'integrations',
		itemIndex,
		{},
	) as IDataObject;
	const extraMetadata =
		(integrations.metadata as
			| {
					values?: Array<{ key?: string; valueMode?: string; value?: string }>;
			  }
			| undefined) ?? {};

	for (const row of extraMetadata.values ?? []) {
		const key = row.key?.trim() ?? '';

		if (key === '') {
			continue;
		}

		if (Object.prototype.hasOwnProperty.call(defaultMetadata, key)) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`${key} conflicts with default metadata.`,
			);
		}

		if (row.valueMode === 'json') {
			try {
				metadata[key] = JSON.parse(row.value ?? '');
			} catch {
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`${key} metadata value must be valid JSON.`,
				);
			}
			continue;
		}

		metadata[key] = row.value ?? '';
	}

	return metadata;
}
