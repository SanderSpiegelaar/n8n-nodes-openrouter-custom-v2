import type { IExecuteFunctions, ILoadOptionsFunctions, INodeListSearchResult, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class OpenrouterLlm implements INodeType {
    description: INodeTypeDescription;
    methods: {
        listSearch: {
            getOpenRouterModels(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
        };
        loadOptions: {
            getOpenRouterModelOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
