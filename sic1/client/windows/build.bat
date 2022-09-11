pushd ..
rd /s /q .parcel-cache
call npm run build
popd

mkdir content\shared
copy /y redist\MicrosoftEdgeWebview2Setup.exe content\shared
copy /y webview2.vdf content\shared

msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x86 /p:Configuration=Release
mkdir content\32bit
xcopy /iqherky Release\assets content\32bit\assets
copy /y Release\sic1.exe content\32bit
copy /y Release\sic1.tlb content\32bit
copy /y Release\steam_api.dll content\32bit
copy /y Release\WebView2Loader.dll content\32bit

msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x64 /p:Configuration=Release
mkdir content\64bit
xcopy /iqherky x64\Release\assets content\64bit\assets
copy /y x64\Release\sic1.exe content\64bit
copy /y x64\Release\sic1.tlb content\64bit
copy /y x64\Release\steam_api64.dll content\64bit
copy /y x64\Release\WebView2Loader.dll content\64bit
