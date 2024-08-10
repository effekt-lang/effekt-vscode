declare module 'semver' {
    export function gt(v1: string, v2: string, loose?: boolean): boolean;
    export function lt(v1: string, v2: string, loose?: boolean): boolean;
    export function clean(v: string, loose?: boolean): string | null;
}