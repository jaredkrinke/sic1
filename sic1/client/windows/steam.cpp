#include <string>
#include <wil/result.h>
#include <steam/isteamfriends.h>
#include "steam.h"

using namespace std;
using namespace wil;

Steam::Steam() {
}

STDMETHODIMP Steam::get_UserName(BSTR* stringResult) try {
    wstring name(Widen(SteamFriends()->GetPersonaName()));
    *stringResult = SysAllocString(name.c_str());
    return S_OK;
}
CATCH_RETURN();
