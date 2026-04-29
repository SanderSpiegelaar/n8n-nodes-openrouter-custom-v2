import type { IExecuteFunctions, ILoadOptionsFunctions, INodeListSearchResult, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class OpenrouterLlm implements INodeType {
    description: INodeTypeDescription;
    methods: {
        listSearch: {
            getOpenRouterModels(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
