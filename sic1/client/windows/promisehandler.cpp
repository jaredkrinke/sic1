#include "stdafx.h"
#include "promisehandler.h"

#define IID_UNK_ARGS(pType) __uuidof(*(pType)), reinterpret_cast<IUnknown*>(pType)

void Promise::RunClosureOnThreadPool(std::unique_ptr<std::function<void()>> pf) {
    auto callback = [](PTP_CALLBACK_INSTANCE, void* pv) {
        std::unique_ptr<std::function<void()>> pf(reinterpret_cast<std::function<void()>*>(pv));
        (*(pf.get()))();
    };

    auto f = pf.release();
    if (!TrySubmitThreadpoolCallback(callback, f, nullptr))
    {
        // Not run; cleanup
        delete f;
        THROW_LAST_ERROR();
    }
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

void Promise::Cleanup() {
    // TODO: Need to use custom thread pool group to support waiting
    // TODO: Actually call this somewhere!
}
