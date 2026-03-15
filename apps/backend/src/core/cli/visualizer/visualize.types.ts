export interface RouteConfigInfo {
    method: string | null;
    isFileUpload: boolean | null;
    error?: string;
}

export interface InjectableConfig {
    type: string;
    domain?: string;
    dependencies?: string[];
    dependents?: string[];
    isGlobal?: boolean;
}

export type InjectablesRegistry = Record<string, InjectableConfig>;
