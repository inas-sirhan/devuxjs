import * as p from '@clack/prompts';
import { getExistingDomains, getEndpointsForDomain, getDomainReposForDomain, getDomainServicesForDomain, getAppServices } from '@/core/cli/utils/registry-helpers';
import { withBackOption, handleCancel, BACK_VALUE } from '@/core/cli/utils/ui-utils';


interface SelectFromListConfig {
    items: string[];
    message: string;
    emptyMessage: string;
}

async function selectFromList(config: SelectFromListConfig): Promise<string | null> {
    if (config.items.length === 0) {
        p.log.warning(config.emptyMessage);
        return null;
    }

    const options = withBackOption(config.items.map(item => ({ value: item, label: item })));

    const selected = await p.autocomplete({ message: config.message, options });

    if (p.isCancel(selected) === true) {
        handleCancel();
    }
    if (selected === BACK_VALUE) {
        return null;
    }

    return selected;
}


export async function selectDomain(message = 'Select domain:'): Promise<string | null> {
    return await selectFromList({
        items: getExistingDomains(),
        message,
        emptyMessage: 'No domains found. Create a domain first.',
    });
}

export async function selectEndpoint(domain: string, message = 'Select endpoint:'): Promise<string | null> {
    return await selectFromList({
        items: getEndpointsForDomain(domain),
        message,
        emptyMessage: `No endpoints found in domain "${domain}".`,
    });
}

export async function selectDomainRepo(domain: string, message = 'Select repo:'): Promise<string | null> {
    return await selectFromList({
        items: getDomainReposForDomain(domain),
        message,
        emptyMessage: `No domain repos found in domain "${domain}".`,
    });
}

export async function selectDomainService(domain: string, message = 'Select service:'): Promise<string | null> {
    return await selectFromList({
        items: getDomainServicesForDomain(domain),
        message,
        emptyMessage: `No domain services found in domain "${domain}".`,
    });
}

export async function selectAppService(message = 'Select app service:'): Promise<string | null> {
    return await selectFromList({
        items: getAppServices(),
        message,
        emptyMessage: 'No app services found.',
    });
}
