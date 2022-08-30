mkdir builds

for /f %%i in ('PowerShell Get-Date -Format FileDateTimeUniversal') do (
msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x86
powershell Compress-Archive -Path Release\assets,Release\sic1.exe,Release\WebView2Loader.dll -DestinationPath "builds\\sic1-%%i-x86.zip"

msbuild sic1.sln /p:Configuration=Release /t:rebuild /p:Platform=x64
powershell Compress-Archive -Path x64\Release\assets,x64\Release\sic1.exe,x64\Release\WebView2Loader.dll -DestinationPath "builds\\sic1-%%i-x64.zip"
)
