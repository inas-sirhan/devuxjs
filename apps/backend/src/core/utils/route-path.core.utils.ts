



const COLON = ':' as const;
const SLASH = '/' as const;

type OnlyStringOrNumber<T> = Pick<T, {
    [K in keyof T]: [T[K]] extends [never] 
        ? never 
        : T[K] extends string | number 
            ? K 
            : never
}[keyof T]>;

export class RoutePath<TRequest> {
    private readonly segments: string[];
    private readonly normalizedSegmentsSet: Set<string>;
    private readonly pathParams: string[];
    private lastSegmentType: "none" | "segment" | "path-param";
    private firstSegment: string;
    public constructor() {
        this.segments = [];
        this.normalizedSegmentsSet = new Set();
        this.pathParams = [];
        this.appendRawSegment('api');
        this.lastSegmentType = "none";
        this.firstSegment = "";
    }

    private static isValidSegment(segment: string): boolean {
        const segmentRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
        if (segmentRegex.test(segment) === false) { 
            return false;
        }
        if (segment.includes('--') === true) { 
            return false; 
        }
        return true;
    }

    private static isValidPathParamName(pathName: string): boolean {
        const pathNameRegex = /^[a-z][a-zA-Z0-9]*$/;
        if (pathNameRegex.test(pathName) === false) { 
            return false;
        }
        return true;
    }

    public isValidPath(): boolean {
        if (this.lastSegmentType === 'none') {
            return false;
        }
        return true;
    }

    private appendRawSegment(segment: string): this {
        let normalizedSegment = segment.toLowerCase();
        if (normalizedSegment.startsWith(COLON) === true) {
            normalizedSegment = normalizedSegment.slice(1); 
        }
        if (this.normalizedSegmentsSet.has(normalizedSegment) === true) {
            throw new Error(`Duplicate route segment (in lowercase): "${segment}".`);
        }
        this.segments.push(segment);
        this.normalizedSegmentsSet.add(normalizedSegment);
        return this;
    }

    public static(segment: string): this  {
        if (RoutePath.isValidSegment(segment) === false) {
            throw new Error(`Invalid segment syntax: "${segment}". Follow the rules..`);
        }
        if (this.lastSegmentType === 'none') {
            this.firstSegment = segment;
        }
        this.lastSegmentType = 'segment';
        return this.appendRawSegment(segment);
    }

    public param<K extends keyof OnlyStringOrNumber<TRequest> & string>(paramName: K): RoutePath<Omit<TRequest, K>> {
        if (RoutePath.isValidPathParamName(paramName) === false) {
            throw new Error(`Invalid path param name: "${paramName}". Must be camelCase (letters and digits only).`);
        }
        if (this.lastSegmentType !== 'segment') {
            throw new Error(`Error, appending path params must be done after a domain/resource segment.`);
        }
        this.pathParams.push(paramName);
        this.lastSegmentType = 'path-param';
        return this.appendRawSegment(`${COLON}${paramName}`) ;
    }

    public getPathParams(): string[] {
        return this.pathParams;
    }

    public hasPathParams(): boolean {
        return this.pathParams.length > 0;
    }

    public getExpressPath(): string {
        return SLASH + this.segments.join(SLASH);
    }

    public getOpenApiPath(): string {
        return SLASH + this.segments.map(segment => segment.startsWith(COLON) ? `{${segment.slice(1)}}` : segment).join(SLASH);
    }

    public getDomainName(): string {
        if (this.lastSegmentType === 'none') {
            throw new Error(`No segments added yet, cannot get domain/resource.`);
        }
        return this.firstSegment;
    }

}
