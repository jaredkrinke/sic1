#pragma once

#include <string>
#include <locale>
#include <codecvt>
#include <limits>
#include <fstream>
#include <synchapi.h>
#include <processthreadsapi.h>
#include <oleauto.h>
#include <wil/result.h>
#include <wil/resource.h>

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
		size_t count = static_cast<size_t>(file.gcount()); // Note: No large file support
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

namespace Ole {
	template<typename T>
	class SafeArrayAccessor {
	public:
		SafeArrayAccessor(SAFEARRAY* array): m_array(array) {
			m_size = array->rgsabound[0].cElements;

			void* data = nullptr;
			THROW_IF_FAILED(SafeArrayAccessData(array, &data));
			m_data = reinterpret_cast<T*>(data);
		}

		~SafeArrayAccessor() {
			SafeArrayUnaccessData(m_array);
		}

		T* Get() {
			return static_cast<T*>(m_data);
		}

		size_t Count() {
			return static_cast<size_t>(m_size);
		}

		// For range-based looping
		typedef T* iterator;
		typedef const T* const_iterator;

		iterator begin() {
			return &m_data[0];
		}

		iterator end() {
			return &m_data[m_size];
		}

		const_iterator begin() const {
			return &m_data[0];
		}

		const_iterator end() const {
			return &m_data[m_size];
		}

	private:
		SAFEARRAY* m_array;
		T* m_data;
		LONG m_size;
	};
}

namespace wilx {
	using unique_safearray = wil::unique_any<SAFEARRAY*, decltype(&::SafeArrayDestroy), ::SafeArrayDestroy>;
	using unique_hbrush = wil::unique_any<HBRUSH, decltype(&::DeleteObject), ::DeleteObject>;

	inline unique_safearray make_unique_safearray(VARTYPE vt, UINT cDims, SAFEARRAYBOUND* rgsabound) {
		unique_safearray result(::SafeArrayCreate(vt, cDims, rgsabound));
		THROW_IF_NULL_ALLOC(result);
		return result;
	}

	inline wil::unique_bstr make_unique_bstr(const OLECHAR* psz) {
		wil::unique_bstr result(::SysAllocString(psz));
		THROW_IF_NULL_ALLOC(result);
		return result;
	}
}

namespace String {
	const wchar_t* const whitespace = L" \t\r\n";

	inline std::wstring Widen(const char* multibyteString) {
		int size = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, multibyteString, -1, nullptr, 0);
		std::unique_ptr<wchar_t[]> buffer = std::make_unique<wchar_t[]>(size);
		THROW_LAST_ERROR_IF(MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, multibyteString, -1, buffer.get(), size) != size);
		return std::wstring(buffer.get());
	}

	inline std::string Narrow(const wchar_t* wideString) {
		int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, wideString, -1, nullptr, 0, nullptr, nullptr);
		std::unique_ptr<char[]> buffer = std::make_unique<char[]>(size);
		THROW_LAST_ERROR_IF(WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, wideString, -1, buffer.get(), size, nullptr, nullptr) != size);
		return std::string(buffer.get());
	}

	inline std::vector<std::wstring> Split(const std::wstring& str, wchar_t separator) {
		std::vector<std::wstring> chunks;
		size_t position = 0;
		while (position < str.size()) {
			auto endOfChunk = str.find(separator, position);
			if (endOfChunk == std::wstring::npos) {
				endOfChunk = str.size();
			}
			chunks.push_back(str.substr(position, (endOfChunk - position)));
			position = endOfChunk + 1;
		}
		return chunks;
	}

	inline std::wstring Trim(const std::wstring& str) {
		if (str.empty()) {
			return L"";
		}

		auto startPosition = str.find_first_not_of(whitespace);
		auto endPosition = str.find_last_not_of(whitespace);
		return str.substr(startPosition, endPosition - startPosition + 1);
	}
}

namespace Ini {
	enum class StructIniFieldType {
		Int32 = 1,
		Double
	};

	typedef struct {
		const wchar_t* name;
		StructIniFieldType type;
		size_t offset;
	} StructIniField;

	template<typename T>
	inline bool StructToIni(T* s, const wchar_t* fileName, const StructIniField* fields, size_t fieldCount) {
		try {
			std::wofstream file(fileName);
			if (!file.is_open()) {
				return false;
			}

			file.imbue(File::GetLocaleUtf8());
			for (size_t i = 0; i < fieldCount; i++) {
				const auto field = fields[i];
				file << field.name << L"=";
				switch (field.type) {
				case StructIniFieldType::Int32: {
					int value = static_cast<int*>(static_cast<void*>(static_cast<unsigned char*>(static_cast<void*>(s)) + field.offset))[0];
					file << value;
					break;
				}

				case StructIniFieldType::Double: {
					double value = static_cast<double*>(static_cast<void*>(static_cast<unsigned char*>(static_cast<void*>(s)) + field.offset))[0];
					file << value;
					break;
				}
				}
				file << L"\n";
			}
			return true;
		}
		catch (...) {
			return false;
		}
	}

	template<typename T>
	inline bool IniToStruct(const wchar_t* fileName, T* s, const StructIniField* fields, size_t fieldCount) {
		try {
			std::wstring content;
			if (!File::TryReadAllTextUtf8(fileName, content)) {
				return false;
			}

			std::vector<std::wstring> lines = String::Split(content, L'\n');
			for (const auto& line : lines) {
				const auto trimmed = String::Trim(line);
				if (trimmed[0] == L';') {
					continue;
				}

				const auto equalsPosition = trimmed.find(L"=");
				if (equalsPosition == std::wstring::npos) {
					return false;
				}

				const auto fieldName = trimmed.substr(0, equalsPosition);
				const auto fieldValue = trimmed.substr(equalsPosition + 1, trimmed.size() - equalsPosition - 1);
				bool found = false;
				for (size_t i = 0; i < fieldCount; i++) {
					const auto& field = fields[i];
					if (CompareStringOrdinal(field.name, -1, fieldName.c_str(), -1, TRUE) == CSTR_EQUAL) {
						found = true;
						switch (field.type) {
						case StructIniFieldType::Int32: {
							int* ptr = static_cast<int*>(static_cast<void*>(static_cast<unsigned char*>(static_cast<void*>(s)) + field.offset));
							*ptr = std::stoi(fieldValue);
							break;
						}

						case StructIniFieldType::Double: {
							double* ptr = static_cast<double*>(static_cast<void*>(static_cast<unsigned char*>(static_cast<void*>(s)) + field.offset));
							*ptr = std::stod(fieldValue);
break;
						}
						}
						break;
					}
				}

				if (!found) {
					return false;
				}
			}

			return true;
		}
		catch (...) {
			return false;
		}
	}
}
namespace Sync {
	class ThreadSafeCounter {
	public:
		ThreadSafeCounter() : m_count(0) {
		}

		long Increment() {
			return InterlockedIncrement(&m_count);
		}

		long Decrement() {
			return InterlockedDecrement(&m_count);
		}

		long Get() {
			return m_count;
		}

	private:
		long m_count;
	};

	class CriticalSection {
	public:
		CriticalSection() {
			InitializeCriticalSection(&m_cs);
		}

		~CriticalSection() {
			DeleteCriticalSection(&m_cs);
		}

		wil::cs_leave_scope_exit Lock() {
			return wil::EnterCriticalSection(&m_cs);
		}

	private:
		CRITICAL_SECTION m_cs;
	};

	class AutoResetEvent {
	public:
		AutoResetEvent() {
			m_event.reset(CreateEvent(nullptr, FALSE, FALSE, nullptr));
			THROW_LAST_ERROR_IF_NULL(m_event.get());
		}

		static unsigned int WaitForAny(const std::vector<HANDLE>& handles) {
			DWORD result = WaitForMultipleObjects(static_cast<DWORD>(handles.size()), handles.data(), FALSE, INFINITE);
			THROW_LAST_ERROR_IF(result == WAIT_FAILED);
			return result - WAIT_OBJECT_0;
		}

		HANDLE Get() {
			return m_event.get();
		}

		void Wait() {
			DWORD result = WaitForSingleObject(m_event.get(), INFINITE);
			THROW_LAST_ERROR_IF(result == WAIT_FAILED);
		}

		void Signal() {
			THROW_LAST_ERROR_IF(!SetEvent(m_event.get()));
		}

	private:
		wil::unique_handle m_event;
	};
}

namespace Win32 {
	inline bool TryGetExecutableDirectory(std::wstring& dir) {
		wchar_t buffer[MAX_PATH];
		DWORD charsWritten = GetModuleFileName(nullptr, buffer, ARRAYSIZE(buffer));
		if (charsWritten != 0 && charsWritten != ARRAYSIZE(buffer)) {
			std::wstring executablePath(buffer);
			std::wstring::size_type lastBackslash = executablePath.find_last_of(L"\\");
			if (lastBackslash != std::wstring::npos) {
				dir = executablePath.substr(0, lastBackslash);
				return true;
			}
		}
		return false;
	}
}
