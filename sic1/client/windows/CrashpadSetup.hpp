#pragma once

#include <string>

namespace backtrace
{
	bool initializeCrashpad(const std::wstring& db_path, const std::wstring& handler_path);
}
