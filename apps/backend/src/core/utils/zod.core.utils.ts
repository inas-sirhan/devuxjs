import type { RequestSchema } from '@/core/types/core.types';
import { createZodObject } from '@packages/shared-core/zod/shared.core.zod.utils';
import * as z from 'zod';


const alreadyValidatedSchemas = new Set<z.ZodTypeAny>();


function unwrapZodEffects<T extends z.ZodTypeAny>(schema: T): z.ZodTypeAny {
    if (schema instanceof z.ZodEffects) {
        return unwrapZodEffects(schema.innerType());
    }
    return schema;
}


function assertNoMutations(
    schema: z.ZodTypeAny,
    schemaName: string,
    path = '',
    visited: Set<z.ZodTypeAny> = new Set()
): void {
    if (visited.has(schema) === true) {
        return;
    }
    visited.add(schema);

    const location = path === '' ? 'root' : path;

    if (schema instanceof z.ZodEffects) {
        const effectType = schema._def.effect.type;
        if (effectType !== 'refinement') {
            throw new Error(
                `${schemaName} has '${effectType}' at ${location}. ` +
                `Only refinements are allowed in internal schemas (repos, domain services, responses). ` +
                `Transforms and preprocessors are not allowed.`
            );
        }
        assertNoMutations(schema._def.schema, schemaName, path, visited);
        return;
    }

    if (schema instanceof z.ZodString) {
        const mutatingKinds = ['trim', 'toLowerCase', 'toUpperCase'];
        const found = schema._def.checks?.find(c => mutatingKinds.includes(c.kind) === true);
        if (found !== undefined) {
            throw new Error(
                `${schemaName} has '${found.kind}' at ${location}. ` +
                `String mutations are not allowed in internal schemas.`
            );
        }
    }

    if ('coerce' in schema._def && schema._def.coerce === true) {
        throw new Error(
            `${schemaName} has coercion at ${location}. ` +
            `Coercion is not allowed in internal schemas.`
        );
    }

    if (schema instanceof z.ZodObject) {
        if (schema._def.unknownKeys !== 'strict') {
            throw new Error(
                `${schemaName} at ${location} must be a strict object. ` +
                `Use createZodObject() or z.object().strict() instead of z.object().`
            );
        }
        for (const [key, value] of Object.entries(schema.shape)) {
            assertNoMutations(value as z.ZodTypeAny, schemaName, path !== '' ? `${path}.${key}` : key, visited);
        }
        return;
    }

    if (schema instanceof z.ZodDefault) {
        throw new Error(
            `${schemaName} has 'default()' at ${location}. ` +
            `Default values are not allowed in internal schemas.`
        );
    }

    if (schema instanceof z.ZodCatch) {
        throw new Error(
            `${schemaName} has 'catch()' at ${location}. ` +
            `Catch fallbacks are not allowed in internal schemas.`
        );
    }

    if (schema instanceof z.ZodArray) {
        assertNoMutations(schema._def.type, schemaName, `${path}[]`, visited);
        return;
    }

    if (schema instanceof z.ZodOptional) {
        assertNoMutations(schema.unwrap(), schemaName, path, visited);
        return;
    }

    if (schema instanceof z.ZodNullable) {
        assertNoMutations(schema.unwrap(), schemaName, path, visited);
        return;
    }

    if (schema instanceof z.ZodBranded) {
        assertNoMutations(schema.unwrap(), schemaName, path, visited);
        return;
    }

    if (schema instanceof z.ZodUnion) {
        (schema._def.options as z.ZodTypeAny[]).forEach((opt, i) =>
            assertNoMutations(opt, schemaName, `${path}(union[${i}])`, visited)
        );
        return;
    }

    if (schema instanceof z.ZodDiscriminatedUnion) {
        (schema._def.options as z.ZodTypeAny[]).forEach((opt, i) =>
            assertNoMutations(opt, schemaName, `${path}(discriminated[${i}])`, visited)
        );
        return;
    }

    if (schema instanceof z.ZodTuple) {
        (schema._def.items as z.ZodTypeAny[]).forEach((item, i) =>
            assertNoMutations(item, schemaName, `${path}[${i}]`, visited)
        );
        return;
    }

    if (schema instanceof z.ZodRecord) {
        assertNoMutations(schema._def.valueType, schemaName, `${path}[record]`, visited);
        return;
    }

    if (schema instanceof z.ZodIntersection) {
        assertNoMutations(schema._def.left, schemaName, `${path}(intersection.left)`, visited);
        assertNoMutations(schema._def.right, schemaName, `${path}(intersection.right)`, visited);
        return;
    }

    if (schema instanceof z.ZodMap) {
        assertNoMutations(schema._def.keyType, schemaName, `${path}(map.key)`, visited);
        assertNoMutations(schema._def.valueType, schemaName, `${path}(map.value)`, visited);
        return;
    }

    if (schema instanceof z.ZodSet) {
        assertNoMutations(schema._def.valueType, schemaName, `${path}(set)`, visited);
        return;
    }

    if (schema instanceof z.ZodLazy) {
        assertNoMutations(schema._def.getter(), schemaName, path, visited);
        return;
    }

    if (schema instanceof z.ZodPipeline) {
        assertNoMutations(schema._def.in, schemaName, `${path}(pipeline.in)`, visited);
        assertNoMutations(schema._def.out, schemaName, `${path}(pipeline.out)`, visited);
        return;
    }
}


function assertNoMutationsOnce(schema: z.ZodTypeAny, schemaName: string): void {
    if (alreadyValidatedSchemas.has(schema) === true) {
        return;
    }
    assertNoMutations(schema, schemaName);
    alreadyValidatedSchemas.add(schema);
}


function getUnionOptions(schema: RequestSchema): z.ZodObject<z.ZodRawShape, 'strict'>[] {
    const unwrapped = unwrapZodEffects(schema);

    if (unwrapped instanceof z.ZodDiscriminatedUnion) {
        return unwrapped.options as z.ZodObject<z.ZodRawShape, 'strict'>[];
    }

    if (unwrapped instanceof z.ZodUnion) {
        return (unwrapped.options as z.ZodTypeAny[])
            .map(opt => unwrapZodEffects(opt) as z.ZodObject<z.ZodRawShape, 'strict'>);
    }

    return [unwrapped as z.ZodObject<z.ZodRawShape, 'strict'>];
}


function validateKeysInAllOptions(
    schema: RequestSchema,
    requiredKeys: string[]
): { valid: true } | { valid: false; missingKeys: Map<string, string[]> } {
    const options = getUnionOptions(schema);
    const missingKeys = new Map<string, string[]>();

    for (const key of requiredKeys) {
        const missingInOptions: string[] = [];
        for (let i = 0; i < options.length; i++) {
            const optionKeys = Object.keys(options[i].shape);
            if (optionKeys.includes(key) === false) {
                missingInOptions.push(`option[${i}]`);
            }
        }
        if (missingInOptions.length > 0) {
            missingKeys.set(key, missingInOptions);
        }
    }

    if (missingKeys.size > 0) {
        return { valid: false, missingKeys };
    }
    return { valid: true };
}


// function pickFromSchema<K extends string>(
//     schema: RequestSchema,
//     keys: Record<K, true>
// ): RequestSchema {
//     const keySet = new Set(Object.keys(keys));
//     const unwrapped = unwrapZodEffects(schema);
//
//     if (unwrapped instanceof z.ZodDiscriminatedUnion) {
//         const discriminator = unwrapped.discriminator;
//         const newOptions = unwrapped.options.map((opt: z.ZodObject<z.ZodRawShape, 'strict'>) => {
//             const picked: z.ZodRawShape = {};
//             for (const key of keySet) {
//                 if (key in opt.shape) {
//                     picked[key] = opt.shape[key];
//                 }
//             }
//             return createZodObject(picked);
//         });
//
//         if (keySet.has(discriminator)) {
//             return z.discriminatedUnion(discriminator, newOptions as [z.ZodObject<z.ZodRawShape, 'strict'>, ...z.ZodObject<z.ZodRawShape, 'strict'>[]]);
//         }
//         return z.union(newOptions as [z.ZodObject<z.ZodRawShape, 'strict'>, z.ZodObject<z.ZodRawShape, 'strict'>, ...z.ZodObject<z.ZodRawShape, 'strict'>[]]);
//     }
//
//     if (unwrapped instanceof z.ZodUnion) {
//         const newOptions = (unwrapped.options as z.ZodTypeAny[])
//             .map(opt => {
//                 const unwrappedOpt = unwrapZodEffects(opt) as z.ZodObject<z.ZodRawShape, 'strict'>;
//                 const picked: z.ZodRawShape = {};
//                 for (const key of keySet) {
//                     if (key in unwrappedOpt.shape) {
//                         picked[key] = unwrappedOpt.shape[key];
//                     }
//                 }
//                 return createZodObject(picked);
//             });
//         return z.union(newOptions as [z.ZodObject<z.ZodRawShape, 'strict'>, z.ZodObject<z.ZodRawShape, 'strict'>, ...z.ZodObject<z.ZodRawShape, 'strict'>[]]);
//     }
//
//     const obj = unwrapped as z.ZodObject<z.ZodRawShape, 'strict'>;
//     const picked: z.ZodRawShape = {};
//     for (const key of keySet) {
//         if (key in obj.shape) {
//             picked[key] = obj.shape[key];
//         }
//     }
//     return createZodObject(picked);
// }


function omitFromSchema<K extends string>(
    schema: RequestSchema,
    keys: Record<K, true>
): RequestSchema {
    const keySet = new Set(Object.keys(keys));
    const unwrapped = unwrapZodEffects(schema);

    if (unwrapped instanceof z.ZodDiscriminatedUnion) {
        const discriminator = unwrapped.discriminator;

        if (keySet.has(discriminator)) {
            throw new Error(
                `Cannot omit discriminator key '${discriminator}' from discriminated union. ` +
                `The discriminator is required for the union to function.`
            );
        }

        const newOptions = unwrapped.options.map((opt: z.ZodObject<z.ZodRawShape, 'strict'>) => {
            const remaining: z.ZodRawShape = {};
            for (const key of Object.keys(opt.shape)) {
                if (keySet.has(key) === false) {
                    remaining[key] = opt.shape[key];
                }
            }
            return createZodObject(remaining);
        });

        return z.discriminatedUnion(discriminator, newOptions as [z.ZodObject<z.ZodRawShape, 'strict'>, ...z.ZodObject<z.ZodRawShape, 'strict'>[]]);
    }

    if (unwrapped instanceof z.ZodUnion) {
        const newOptions = (unwrapped.options as z.ZodTypeAny[])
            .map(opt => {
                const unwrappedOpt = unwrapZodEffects(opt) as z.ZodObject<z.ZodRawShape, 'strict'>;
                const remaining: z.ZodRawShape = {};
                for (const key of Object.keys(unwrappedOpt.shape)) {
                    if (keySet.has(key) === false) {
                        remaining[key] = unwrappedOpt.shape[key];
                    }
                }
                return createZodObject(remaining);
            });
        return z.union(newOptions as [z.ZodObject<z.ZodRawShape, 'strict'>, z.ZodObject<z.ZodRawShape, 'strict'>, ...z.ZodObject<z.ZodRawShape, 'strict'>[]]);
    }

    const obj = unwrapped as z.ZodObject<z.ZodRawShape, 'strict'>;
    const remaining: z.ZodRawShape = {};
    for (const key of Object.keys(obj.shape)) {
        if (keySet.has(key) === false) {
            remaining[key] = obj.shape[key];
        }
    }
    return createZodObject(remaining);
}


function getFirstOptionShape(schema: RequestSchema): z.ZodRawShape {
    const options = getUnionOptions(schema);
    return options[0].shape;
}


function getKeyCount(schema: RequestSchema): number {
    return Object.keys(getFirstOptionShape(schema)).length;
}


function isEmpty(schema: RequestSchema): boolean {
    const allOptions = getUnionOptions(schema);
    return allOptions.every(opt => Object.keys(opt.shape).length === 0);
}


export const CoreZodUtils = {
    unwrapZodEffects,
    assertNoMutations,
    assertNoMutationsOnce,
    getUnionOptions,
    validateKeysInAllOptions,
    omitFromSchema,
    getFirstOptionShape,
    getKeyCount,
    isEmpty,
};
