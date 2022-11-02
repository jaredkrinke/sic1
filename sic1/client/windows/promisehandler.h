#pragma once

#include <functional>
#include <memory>
#include <objbase.h>
#include <windows.h>
#include <wil/result.h>
#include <wil/com.h>

namespace Promise {
    using Handler = std::function<void(VARIANT*)>;
    using CleanupCallback = void (*)();

    void Initialize();
    void RunClosureOnThreadPool(std::unique_ptr<std::function<void()>> pf);
    void ExecutePromiseOnThreadPool(const VARIANT& resolveVariant, const VARIANT& rejectVariant, std::shared_ptr<Handler> handler);
    void Cleanup(CleanupCallback onCompleted);
}

