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
