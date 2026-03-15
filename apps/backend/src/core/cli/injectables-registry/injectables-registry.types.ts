export const useCaseTypes = [
    'use-case:transactional',
    'use-case:non-transactional',
] as const;

export const domainInjectableWithDependentsTypes = [
    'service:domain',
    'repo:domain:transactional',
    'repo:domain:non-transactional',
    'repo:service:domain',
    'repo:endpoint:transactional',
    'repo:endpoint:non-transactional',
] as const;

export const domainInjectableTypes = [...useCaseTypes, ...domainInjectableWithDependentsTypes] as const;

export const nonDomainInjectableTypes = [
    'base',
    'service:core',
    'service:app',
] as const;

export const injectableTypes = [...domainInjectableTypes, ...nonDomainInjectableTypes] as const;

export type UseCaseType = (typeof useCaseTypes)[number];
export type DomainInjectableWithDependentsType = (typeof domainInjectableWithDependentsTypes)[number];
export type DomainInjectableType = (typeof domainInjectableTypes)[number];
export type NonDomainInjectableType = (typeof nonDomainInjectableTypes)[number];
export type InjectableType = (typeof injectableTypes)[number];

interface InjectableConfigBase {
    isGlobal: boolean;
    dependencies: string[];
}

export interface BaseClassConfig extends InjectableConfigBase {
    isCore: true;
    type: 'base';
    bindingType: 'singleton';
}

export interface CoreServiceConfig extends InjectableConfigBase {
    isCore: true;
    type: 'service:core';
    bindingType: 'singleton' | 'value';
    dependents: string[];
}

export interface AppServiceConfig extends InjectableConfigBase {
    isCore: false;
    type: 'service:app';
    bindingType: 'singleton';
    dependents: string[];
}

export interface UseCaseConfig extends InjectableConfigBase {
    isCore: false;
    type: UseCaseType;
    bindingType: 'singleton';
    domain: string;
}

export interface DomainInjectableWithDependentsConfig extends InjectableConfigBase {
    isCore: false;
    type: DomainInjectableWithDependentsType;
    bindingType: 'singleton';
    domain: string;
    dependents: string[];
}

export type InjectableConfig = BaseClassConfig | CoreServiceConfig | AppServiceConfig | UseCaseConfig | DomainInjectableWithDependentsConfig;

export type InjectableConfigWithDependents = CoreServiceConfig | AppServiceConfig | DomainInjectableWithDependentsConfig;

export type BindingType = InjectableConfig['bindingType'];

export type InjectablesRegistry = Record<string, InjectableConfig>;
