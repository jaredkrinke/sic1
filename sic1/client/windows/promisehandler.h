#pragma once

#include <functional>
#include <memory>
#include <objbase.h>
#include <windows.h>
#include <wil/result.h>
#include <wil/com.h>

namespace Promise {
    using Handler = std::function<void(const wil::com_ptr<IDispatch>&)>;

    void RunClosureOnThreadPool(std::unique_ptr<std::function<void()>> pf);
    void ExecutePromiseOnThreadPool(const VARIANT& resolveVariant, const VARIANT& rejectVariant, std::shared_ptr<Handler> handler);
}

