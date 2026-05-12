import type { ILoadOptionsFunctions, INodeListSearchResult, INodePropertyOptions } from 'n8n-workflow';
export declare function searchOpenRouterModelCatalog(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
export declare function loadOpenRouterModelCatalogOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
