#pragma once

#define _CRT_SECURE_NO_WARNINGS

// Target Windows 7
#include <winsdkver.h>
#define _WIN32_WINNT 0x0601
#include <sdkddkver.h>
#include <windows.h>

// C
#include <stdlib.h>

// C++
#include <string>
#include <stdexcept>
#include <memory>

// Steam
#include <steam/steam_api.h>
#include <steam/isteamfriends.h>

// Other
#include <nlohmann/json.hpp>

// Local
#include "steam_call_manager.h"
