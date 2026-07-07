@REM Maven Wrapper script for Windows
@REM Automatically downloads Maven if not available

@echo off
setlocal

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"
set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6"
set "MAVEN_CMD=%MAVEN_HOME%\bin\mvn.cmd"

if not exist "%MAVEN_CMD%" (
    echo Downloading Maven 3.9.6...
    mkdir "%MAVEN_HOME%" 2>nul
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip', '%TEMP%\maven.zip'); Expand-Archive -Path '%TEMP%\maven.zip' -DestinationPath '%USERPROFILE%\.m2\wrapper\dists' -Force; Remove-Item '%TEMP%\maven.zip' -Force"
    if exist "%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6\bin\mvn.cmd" (
        echo Maven 3.9.6 installed successfully.
    ) else (
        echo ERROR: Maven download failed. Please install Maven manually.
        exit /b 1
    )
)

"%MAVEN_CMD%" %*
