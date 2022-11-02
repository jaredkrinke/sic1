#include "stdafx.h"
#include "promisehandler.h"

#define IID_UNK_ARGS(pType) __uuidof(*(pType)), reinterpret_cast<IUnknown*>(pType)

static PTP_POOL threadpool = nullptr;
static PTP_CLEANUP_GROUP threadpoolCleanupGroup = nullptr;
static TP_CALLBACK_ENVIRON threadpoolEnvironment = {};
static Promise::CleanupCallback cleanupCallback = nullptr;

void Promise::Initialize() {
    threadpool = CreateThreadpool(nullptr);
    THROW_LAST_ERROR_IF_NULL(threadpool);
    THROW_LAST_ERROR_IF(!SetThreadpoolThreadMinimum(threadpool, 3));
    SetThreadpoolThreadMaximum(threadpool, 15);

    threadpoolCleanupGroup = CreateThreadpoolCleanupGroup();
    THROW_LAST_ERROR_IF_NULL(threadpoolCleanupGroup);

    InitializeThreadpoolEnvironment(&threadpoolEnvironment);
    SetThreadpoolCallbackPool(&threadpoolEnvironment, threadpool);
    SetThreadpoolCallbackCleanupGroup(&threadpoolEnvironment, threadpoolCleanupGroup, nullptr);
}

void Promise::RunClosureOnThreadPool(std::unique_ptr<std::function<void()>> pf) {
    auto callback = [](PTP_CALLBACK_INSTANCE, void* pv, PTP_WORK) {
        std::unique_ptr<std::function<void()>> pf(reinterpret_cast<std::function<void()>*>(pv));
        (*(pf.get()))();
    };

    PTP_WORK workItem = CreateThreadpoolWork(callback, pf.get(), &threadpoolEnvironment);
    THROW_LAST_ERROR_IF_NULL(workItem);

    SubmitThreadpoolWork(workItem);

    // Ownership of the closure has passed to the thread pool callback
    pf.release();
}

void Promise::ExecutePromiseOnThreadPool(const VARIANT& resolveVariant, const VARIANT& rejectVariant, std::shared_ptr<Promise::Handler> handler) {
    THROW_HR_IF(E_INVALIDARG, resolveVariant.vt != VT_DISPATCH || rejectVariant.vt != VT_DISPATCH);
    IDispatch* resolve = resolveVariant.pdispVal;
    IDispatch* reject = rejectVariant.pdispVal;

    wil::com_ptr<IStream> resolveStream;
    wil::com_ptr<IStream> rejectStream;

    THROW_IF_FAILED(CoMarshalInterThreadInterfaceInStream(IID_UNK_ARGS(resolve), &resolveStream));
    THROW_IF_FAILED(CoMarshalInterThreadInterfaceInStream(IID_UNK_ARGS(reject), &rejectStream));

    RunClosureOnThreadPool(std::make_unique<std::function<void()>>([resolveStream = resolveStream.detach(), rejectStream = rejectStream.detach(), handler]() {
        try {
            auto coinit = wil::CoInitializeEx(COINIT_MULTITHREADED);
            wil::com_ptr<IDispatch> resolve;
            wil::com_ptr<IDispatch> reject;

            HRESULT hrUnmarshal1 = CoGetInterfaceAndReleaseStream(resolveStream, IID_PPV_ARGS(&resolve));
            HRESULT hrUnmarshal2 = CoGetInterfaceAndReleaseStream(rejectStream, IID_PPV_ARGS(&reject));

            THROW_IF_FAILED(hrUnmarshal1);
            THROW_IF_FAILED(hrUnmarshal2);

            // Run the supplied handler
            wil::unique_variant result;
            HRESULT hr = ([&]() -> HRESULT {
                try {
                    (*handler)(result.addressof());
                    return S_OK;
                }
                CATCH_RETURN();
            })();

            if (SUCCEEDED(hr)) {
                // Handler succeeded; resolve the promise
                DISPPARAMS params = { nullptr, nullptr, 0, 0 };

                if (result.vt != VT_EMPTY) {
                    params.cArgs = 1;
                    params.rgvarg = &result;
                }

                THROW_IF_FAILED(resolve->Invoke(DISPID_VALUE, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_METHOD, &params, nullptr, nullptr, nullptr));
            }
            else {
                // Handler failed; reject the promise
                VARIANTARG reason;
                VariantInit(&reason);
                reason.vt = VT_I4;
                reason.lVal = hr;

                DISPPARAMS params;
                params.cArgs = 1;
                params.cNamedArgs = 0;
                params.rgdispidNamedArgs = nullptr;
                params.rgvarg = &reason;

                THROW_IF_FAILED(reject->Invoke(DISPID_VALUE, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_METHOD, &params, nullptr, nullptr, nullptr));
            }
        }
        CATCH_LOG();
    }));
}

void Promise::Cleanup(Promise::CleanupCallback onCompleted) {
    // Run asynchronously because the thread pool tasks used in this project require the main window message queue to be unblocked

    cleanupCallback = onCompleted;
    CreateThread(nullptr, 0, [](LPVOID data) -> DWORD {
        CloseThreadpoolCleanupGroupMembers(threadpoolCleanupGroup, TRUE, nullptr);
        CloseThreadpoolCleanupGroup(threadpoolCleanupGroup);
        CloseThreadpool(threadpool);
        DestroyThreadpoolEnvironment(&threadpoolEnvironment);

        cleanupCallback();
        return 0;
    }, nullptr, 0, nullptr);
}
