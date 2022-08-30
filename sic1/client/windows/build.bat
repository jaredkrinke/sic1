msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x86
powershell Compress-Archive -Path Release\assets,Release\sic1.exe,Release\WebView2Loader.dll -DestinationPath "sic1-x86-$(Get-Date -Format FileDateTimeUniversal).zip"

msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x64
powershell Compress-Archive -Path x64\Release\assets,x64\Release\sic1.exe,x64\Release\WebView2Loader.dll -DestinationPath "sic1-x64-$(Get-Date -Format FileDateTimeUniversal).zip"
