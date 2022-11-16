rem Extract client version from package.json
for /f %%i in ('node -e "process.stdout.write(require(`../package.json`).version)"') do set SIC1_VERSION=%%i

pushd ..
rd /s /q dist
rd /s /q .parcel-cache
call npm run build:mail
call npm run build
popd

mkdir content\shared
copy /y redist\MicrosoftEdgeWebview2Setup.exe content\shared
copy /y webview2.vdf content\shared

rd /s /q Debug
rd /s /q Release
msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x86 /p:Configuration=Release
rd /s /q content\32bit
mkdir content\32bit
xcopy /iqherky Release\assets content\32bit\assets
copy /y Release\crashpad_handler.exe content\32bit
copy /y Release\sic1.exe content\32bit
copy /y Release\steam_api.dll content\32bit
copy /y Release\WebView2Loader.dll content\32bit

rd /s /q x64
msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x64 /p:Configuration=Release
rd /s /q content\64bit
mkdir content\64bit
xcopy /iqherky x64\Release\assets content\64bit\assets
copy /y x64\Release\crashpad_handler.exe content\64bit
copy /y x64\Release\sic1.exe content\64bit
copy /y x64\Release\steam_api64.dll content\64bit
copy /y x64\Release\WebView2Loader.dll content\64bit

rd /s /q symbols
mkdir symbols\32bit
copy /y Release\*.pdb symbols\32bit
mkdir symbols\64bit
copy /y x64\Release\*.pdb symbols\64bit
mkdir symbols\shared
copy /y ..\dist\*.map symbols\shared

powershell -Command "$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH_mm_ssZ'); Compress-Archive -Path content,symbols -DestinationPath artifacts\sic1-$Env:SIC1_VERSION-$timestamp.zip;"
