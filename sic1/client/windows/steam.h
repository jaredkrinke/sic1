#pragma once

#include "dispatchable.h"
#include "host-objects_h.h"

class Steam : public Dispatchable<ISteam> {
public:
    Steam();

    STDMETHODIMP get_UserName(BSTR* stringResult) override;
};
