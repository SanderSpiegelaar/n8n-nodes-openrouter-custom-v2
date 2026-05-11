import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { loadOpenRouterModelCatalogOptions, searchOpenRouterModelCatalog } from './OpenRouterModelCatalog';
export declare class OpenrouterLlm implements INodeType {
    description: INodeTypeDescription;
    methods: {
        listSearch: {
            getOpenRouterModels: typeof searchOpenRouterModelCatalog;
        };
        loadOptions: {
            getOpenRouterModelOptions: typeof loadOpenRouterModelCatalogOptions;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
