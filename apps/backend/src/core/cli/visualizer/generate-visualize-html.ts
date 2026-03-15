import type { InjectablesRegistry, RouteConfigInfo } from './visualize.types';


export function generateEndpointsHtml(registry: InjectablesRegistry, routeConfigs: Record<string, RouteConfigInfo>, title: string): string {
    const registryJson = JSON.stringify(registry);
    const routeConfigsJson = JSON.stringify(routeConfigs);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 10px 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; margin: 0 0 10px 0; font-size: 20px; }

        .controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 15px;
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .controls-row {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        .legend-row {
            border-top: 1px solid #eee;
            padding-top: 10px;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .control-group label {
            font-weight: 500;
            color: #555;
        }
        select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            min-width: 180px;
        }

        .toggles {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        .toggles label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            font-size: 14px;
            color: #555;
        }
        .toggles input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .legend {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-left: auto;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
        }
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 3px;
            border: 2px solid;
        }

        .domain-section {
            margin-bottom: 30px;
        }
        .domain-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px 8px 0 0;
            margin: 0;
            font-size: 18px;
        }

        .endpoint-row {
            background: white;
            border: 1px solid #e0e0e0;
            border-top: none;
            padding: 20px;
        }
        .endpoint-row:last-child {
            border-radius: 0 0 8px 8px;
        }
        .endpoint-header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .endpoint-name {
            font-weight: 600;
            font-size: 16px;
            color: #333;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            margin-left: 8px;
        }
        .badge-tx {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .badge-non-tx {
            background: #eceff1;
            color: #546e7a;
        }
        .badge-method {
            background: #e3f2fd;
            color: #1565c0;
            text-transform: uppercase;
        }
        .badge-file-upload {
            background: #fce4ec;
            color: #c2185b;
        }
        .badge-unknown {
            background: #ffebee;
            color: #c62828;
        }

        .diagram-container {
            overflow-x: auto;
        }

        .hidden { display: none !important; }

        .stats {
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>

    <div class="controls">
        <div class="controls-row">
            <div class="control-group">
                <label>Domain:</label>
                <select id="domainFilter">
                    <option value="all">All Domains</option>
                </select>
            </div>
            <div class="control-group">
                <label>Endpoint:</label>
                <select id="endpointFilter">
                    <option value="all">All Endpoints</option>
                </select>
            </div>
            <div class="control-group">
                <label>Method:</label>
                <select id="methodFilter">
                    <option value="all">All Methods</option>
                    <option value="get">GET</option>
                    <option value="post">POST</option>
                    <option value="put">PUT</option>
                    <option value="patch">PATCH</option>
                    <option value="delete">DELETE</option>
                </select>
            </div>
            <span class="stats" id="stats">0 endpoints</span>

            <div class="toggles">
                <label><input type="checkbox" id="showCore" checked> Show Core</label>
                <label title="Controller, Validator, Presenter"><input type="checkbox" id="showCVP"> Show CVP</label>
                <label title="Show [g]lobal / [r]equest-scoped for app/core services"><input type="checkbox" id="showScope"> Show Scope</label>
            </div>
        </div>

        <div class="controls-row legend-row">
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background:#e3f2fd;border-color:#1976d2"></div>
                    <span>Use-Case</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background:#fff3e0;border-color:#f57c00"></div>
                    <span>Endpoint Repo</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background:#fce4ec;border-color:#c2185b"></div>
                    <span>Domain Repo</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background:#e8f5e9;border-color:#388e3c"></div>
                    <span>Domain Service</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background:#fffde7;border-color:#fbc02d"></div>
                    <span>App Service</span>
                </div>
                <div class="legend-item" id="legendCore">
                    <div class="legend-color" style="background:#eceff1;border-color:#607d8b"></div>
                    <span>Core</span>
                </div>
                <div class="legend-item hidden" id="legendController">
                    <div class="legend-color" style="background:#e1f5fe;border-color:#0288d1"></div>
                    <span>Controller</span>
                </div>
                <div class="legend-item hidden" id="legendValidator">
                    <div class="legend-color" style="background:#f3e5f5;border-color:#7b1fa2"></div>
                    <span>Validator</span>
                </div>
                <div class="legend-item hidden" id="legendPresenter">
                    <div class="legend-color" style="background:#e0f2f1;border-color:#00796b"></div>
                    <span>Presenter</span>
                </div>
                <div class="legend-item" style="border-left:1px solid #ddd;padding-left:15px;margin-left:5px;">
                    <svg width="30" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#333" stroke-width="2"/><polygon points="24,3 30,6 24,9" fill="#333"/></svg>
                    <span>direct</span>
                </div>
                <div class="legend-item">
                    <svg width="30" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="4,2"/><polygon points="24,3 30,6 24,9" fill="#333"/></svg>
                    <span>indirect (via base)</span>
                </div>
            </div>
        </div>
    </div>

    <div id="content"></div>

    <script>
        const registry = ${registryJson};
        const routeConfigs = ${routeConfigsJson};

        const baseClassMap = {
            'use-case:transactional': 'transactional-use-case',
            'use-case:non-transactional': 'non-transactional-use-case',
            'repo:endpoint:transactional': 'transactional-repo',
            'repo:endpoint:non-transactional': 'non-transactional-repo',
            'repo:domain:transactional': 'transactional-repo',
            'repo:domain:non-transactional': 'non-transactional-repo',
            'repo:service:domain': 'transactional-repo',
            'service:domain': 'domain-service-base'
        };

        const baseClassChains = {
            'transactional-use-case': ['transactional-use-case', 'use-case-base'],
            'non-transactional-use-case': ['non-transactional-use-case', 'use-case-base'],
            'transactional-repo': ['transactional-repo', 'repo-base'],
            'non-transactional-repo': ['non-transactional-repo', 'repo-base'],
            'domain-service-base': ['domain-service-base']
        };

        function getStyleClass(type) {
            if (type.startsWith('use-case:')) return 'usecase';
            if (type.startsWith('repo:endpoint:')) return 'endpointRepo';
            if (type === 'repo:domain:transactional' || type === 'repo:domain:non-transactional') return 'domainRepo';
            if (type === 'repo:service:domain') return 'serviceRepo';
            if (type === 'service:domain') return 'domainService';
            if (type === 'service:app') return 'appService';
            if (type === 'service:core') return 'coreService';
            if (type === 'controller') return 'controller';
            if (type === 'validator') return 'validator';
            if (type === 'presenter') return 'presenter';
            return 'default';
        }

        function sanitizeId(name) {
            return name.replace(/-/g, '_');
        }

        function getAllDepsWithSource(config) {
            const result = [];
            const seen = new Set();

            for (const dep of config.dependencies || []) {
                if (!seen.has(dep)) {
                    result.push({ name: dep, source: 'direct' });
                    seen.add(dep);
                }
            }

            const baseClass = baseClassMap[config.type];
            if (baseClass) {
                const chain = baseClassChains[baseClass] || [];
                for (const baseName of chain) {
                    const baseConfig = registry[baseName];
                    if (baseConfig?.dependencies) {
                        for (const dep of baseConfig.dependencies) {
                            if (!seen.has(dep)) {
                                result.push({ name: dep, source: baseName });
                                seen.add(dep);
                            }
                        }
                    }
                }
            }

            return result;
        }

        function generateMermaid(name, config, showCore, showCVP, showScope) {
            const lines = ['flowchart LR', ''];
            const labeledNodes = new Set();
            const edgesSet = new Set();
            const edges = [];

            const baseName = name.replace(/-use-case$/, '');
            const controllerName = baseName + '-controller';
            const validatorName = baseName + '-validator';
            const presenterName = baseName + '-presenter';

            const addNode = (nodeName, nodeConfig) => {
                const nodeId = sanitizeId(nodeName);
                if (!labeledNodes.has(nodeId)) {
                    const styleClass = getStyleClass(nodeConfig.type);
                    let label = nodeName;
                    if (showScope && (nodeConfig.type === 'service:core' || nodeConfig.type === 'service:app')) {
                        const scopeIndicator = nodeConfig.isGlobal ? '[g]' : '[r]';
                        label = nodeName + ' ' + scopeIndicator;
                    }
                    lines.push('    ' + nodeId + '["' + label + '"]:::' + styleClass);
                    labeledNodes.add(nodeId);
                }
            };

            const addEdge = (from, to, isDashed) => {
                const fromId = sanitizeId(from);
                const toId = sanitizeId(to);
                const key = fromId + '->' + toId;
                if (!edgesSet.has(key)) {
                    edgesSet.add(key);
                    return isDashed ? '    ' + fromId + ' -.-> ' + toId : '    ' + fromId + ' --> ' + toId;
                }
                return null;
            };

            const processed = new Set();
            const processDeps = (nodeName, nodeConfig) => {
                if (processed.has(nodeName)) return;
                processed.add(nodeName);

                const deps = getAllDepsWithSource(nodeConfig);
                for (const depInfo of deps) {
                    const depConfig = registry[depInfo.name];
                    if (!depConfig || depConfig.type === 'base') continue;
                    if (!showCore && depConfig.type === 'service:core') continue;

                    addNode(depInfo.name, depConfig);
                    const edge = addEdge(nodeName, depInfo.name, depInfo.source !== 'direct');
                    if (edge) edges.push(edge);

                    processDeps(depInfo.name, depConfig);
                }
            };

            if (showCVP) {
                const ctrlId = sanitizeId(controllerName);
                lines.push('    ' + ctrlId + '[' + controllerName + ']:::controller');
                labeledNodes.add(ctrlId);

                const valId = sanitizeId(validatorName);
                lines.push('    ' + valId + '[' + validatorName + ']:::validator');
                labeledNodes.add(valId);

                const presId = sanitizeId(presenterName);
                lines.push('    ' + presId + '[' + presenterName + ']:::presenter');
                labeledNodes.add(presId);
            }

            addNode(name, config);

            if (showCVP) {
                edges.push('    ' + sanitizeId(controllerName) + ' --> ' + sanitizeId(validatorName));
                edges.push('    ' + sanitizeId(controllerName) + ' --> ' + sanitizeId(name));
                edges.push('    ' + sanitizeId(controllerName) + ' --> ' + sanitizeId(presenterName));
            }

            processDeps(name, config);

            lines.push('');
            lines.push(...edges);
            lines.push('');
            lines.push('    %% Styles');
            lines.push('    classDef usecase fill:#e3f2fd,stroke:#1976d2,stroke-width:2px');
            lines.push('    classDef endpointRepo fill:#fff3e0,stroke:#f57c00,stroke-width:2px');
            lines.push('    classDef domainRepo fill:#fce4ec,stroke:#c2185b,stroke-width:2px');
            lines.push('    classDef serviceRepo fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px');
            lines.push('    classDef domainService fill:#e8f5e9,stroke:#388e3c,stroke-width:2px');
            lines.push('    classDef appService fill:#fffde7,stroke:#fbc02d,stroke-width:2px');
            lines.push('    classDef coreService fill:#eceff1,stroke:#607d8b,stroke-width:2px');
            lines.push('    classDef controller fill:#e1f5fe,stroke:#0288d1,stroke-width:2px');
            lines.push('    classDef validator fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px');
            lines.push('    classDef presenter fill:#e0f2f1,stroke:#00796b,stroke-width:2px');
            lines.push('    classDef default fill:#fafafa,stroke:#9e9e9e');

            return lines.join('\\n');
        }

        const endpoints = [];
        const domains = new Set();
        for (const [name, config] of Object.entries(registry)) {
            if (config.type.startsWith('use-case:')) {
                endpoints.push({ name, domain: config.domain || 'unknown', config });
                if (config.domain) domains.add(config.domain);
            }
        }
        endpoints.sort((a, b) => {
            if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
            return a.name.localeCompare(b.name);
        });

        const domainFilter = document.getElementById('domainFilter');
        const endpointFilter = document.getElementById('endpointFilter');
        const methodFilter = document.getElementById('methodFilter');
        const stats = document.getElementById('stats');
        const showCoreCheckbox = document.getElementById('showCore');
        const showCVPCheckbox = document.getElementById('showCVP');
        const showScopeCheckbox = document.getElementById('showScope');
        const content = document.getElementById('content');

        for (const domain of [...domains].sort()) {
            const opt = document.createElement('option');
            opt.value = domain;
            opt.textContent = domain;
            domainFilter.appendChild(opt);
        }

        for (const ep of endpoints) {
            const opt = document.createElement('option');
            opt.value = ep.name;
            opt.dataset.domain = ep.domain;
            opt.textContent = ep.name.replace(/-use-case$/, '');
            endpointFilter.appendChild(opt);
        }

        let diagramCounter = 0;

        async function renderDiagrams() {
            const selectedDomain = domainFilter.value;
            const selectedEndpoint = endpointFilter.value;
            const selectedMethod = methodFilter.value;
            const showCore = showCoreCheckbox.checked;
            const showCVP = showCVPCheckbox.checked;
            const showScope = showScopeCheckbox.checked;

            const filtered = endpoints.filter(ep => {
                const domainMatch = selectedDomain === 'all' || ep.domain === selectedDomain;
                const endpointMatch = selectedEndpoint === 'all' || ep.name === selectedEndpoint;

                const routeConfig = routeConfigs[ep.name];
                const epMethod = routeConfig?.method || null;
                const methodMatch = selectedMethod === 'all' || epMethod === null || epMethod === selectedMethod;

                return domainMatch && endpointMatch && methodMatch;
            });

            const byDomain = new Map();
            for (const ep of filtered) {
                if (!byDomain.has(ep.domain)) byDomain.set(ep.domain, []);
                byDomain.get(ep.domain).push(ep);
            }

            let html = '';
            for (const [domain, eps] of byDomain) {
                html += '<div class="domain-section"><h2 class="domain-header">' + domain + '</h2>';
                for (const ep of eps) {
                    const mermaidCode = generateMermaid(ep.name, ep.config, showCore, showCVP, showScope);
                    const diagramId = 'diagram-' + (++diagramCounter);

                    let badges = '';

                    const routeConfig = routeConfigs[ep.name];
                    if (routeConfig && routeConfig.method) {
                        badges += '<span class="badge badge-method">' + routeConfig.method + '</span>';
                    }
                    else {
                        badges += '<span class="badge badge-unknown">?</span>';
                    }

                    const isTransactional = ep.config.type === 'use-case:transactional';
                    badges += isTransactional
                        ? '<span class="badge badge-tx">transactional</span>'
                        : '<span class="badge badge-non-tx">non-transactional</span>';

                    if (routeConfig && routeConfig.isFileUpload === true) {
                        badges += '<span class="badge badge-file-upload">file-upload</span>';
                    }

                    html += '<div class="endpoint-row">';
                    html += '<div class="endpoint-header"><span class="endpoint-name">' + ep.name.replace(/-use-case$/, '') + '</span>' + badges + '</div>';
                    html += '<div class="diagram-container"><pre class="mermaid" id="' + diagramId + '">' + mermaidCode + '</pre></div>';
                    html += '</div>';
                }
                html += '</div>';
            }

            content.innerHTML = html;
            stats.textContent = filtered.length + ' endpoint' + (filtered.length !== 1 ? 's' : '');

            await mermaid.run();
        }

        domainFilter.addEventListener('change', () => {
            const selectedDomain = domainFilter.value;
            if (endpointFilter.value !== 'all') {
                const selectedOpt = endpointFilter.querySelector('option[value="' + endpointFilter.value + '"]');
                if (selectedOpt && selectedDomain !== 'all' && selectedOpt.dataset.domain !== selectedDomain) {
                    endpointFilter.value = 'all';
                }
            }
            endpointFilter.querySelectorAll('option[data-domain]').forEach(opt => {
                opt.style.display = (selectedDomain === 'all' || opt.dataset.domain === selectedDomain) ? '' : 'none';
            });
            renderDiagrams();
        });

        endpointFilter.addEventListener('change', renderDiagrams);
        methodFilter.addEventListener('change', renderDiagrams);
        showCoreCheckbox.addEventListener('change', () => {
            document.getElementById('legendCore').classList.toggle('hidden', !showCoreCheckbox.checked);
            renderDiagrams();
        });
        showCVPCheckbox.addEventListener('change', () => {
            const show = showCVPCheckbox.checked;
            document.getElementById('legendController').classList.toggle('hidden', !show);
            document.getElementById('legendValidator').classList.toggle('hidden', !show);
            document.getElementById('legendPresenter').classList.toggle('hidden', !show);
            renderDiagrams();
        });
        showScopeCheckbox.addEventListener('change', renderDiagrams);

        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', wrappingWidth: 9999 }
        });
        renderDiagrams();
    </script>
</body>
</html>`;
}
