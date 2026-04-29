import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class OpenRouterApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: "file:../nodes/OpenrouterLlm/openrouter.svg";
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
