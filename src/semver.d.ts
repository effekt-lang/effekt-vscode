declare module 'semver' {
    export function gt(v1: string, v2: string): boolean;
    export function lt(v1: string, v2: string): boolean;
    export function clean(v: string): string | null;
}