#pragma once

#include <wrl.h>
#include <wil/com.h>
#include "dispatchable.h"
#include "host-objects_h.h"

class Steam : public Dispatchable<ISteam> {
public:
    Steam();

    STDMETHODIMP get_UserName(BSTR* stringResult) override;
};
