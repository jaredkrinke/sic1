export type NativePromiseExecutor<TResult, TArguments extends any[]> = (
        resolve: (result: TResult) => void,
        reject: (status: number) => void, ...args: TArguments
    ) => void;

export function wrapNativePromise<TResult, TArguments extends any[]>(nativeFunction: NativePromiseExecutor<TResult, TArguments>, ...args: TArguments): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => nativeFunction(resolve, reject, ...args));
}
