#include <string>
#include <locale>
#include <codecvt>
#include <limits>
#include <fstream>

namespace File {
	inline std::locale GetLocaleUtf8() {
		return std::locale(std::locale::empty(), new std::codecvt_utf8<wchar_t>);
	}

	inline bool TryReadAllTextUtf8(const wchar_t* fileName, std::wstring& result) noexcept(false) {
		std::wstring text;
		std::wifstream file(fileName);
		if (!file.is_open()) {
			return false;
		}

		file.imbue(GetLocaleUtf8());

		file.ignore((std::numeric_limits<std::streamsize>::max)());
		std::streamsize count = file.gcount();
		file.clear();
		file.seekg(0, file.beg);

		auto buffer = std::make_unique<wchar_t[]>(count + 1);
		file.read(buffer.get(), count);
		buffer[count] = L'\0';

		text = buffer.get();
		result = std::move(text);
		return true;
	}

	inline bool TryWriteAllTextUtf8(const wchar_t* fileName, const wchar_t* text) noexcept(false) {
		std::wofstream file(fileName);
		if (!file.is_open()) {
			return false;
		}

		file.imbue(GetLocaleUtf8());
		file.write(text, wcslen(text));
		return true;
	}
}
