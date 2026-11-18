# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files to restore dependencies
COPY ["WebApi/WebApi.csproj", "WebApi/"]
COPY ["Application/Application.csproj", "Application/"]
COPY ["Domain/Domain.csproj", "Domain/"]
COPY ["Infrastructure/Infrastructure.csproj", "Infrastructure/"]
RUN --mount=type=cache,target=/root/.nuget/packages dotnet restore "WebApi/WebApi.csproj"

# Copy the rest of the source code
COPY . .
WORKDIR "/src/WebApi"
FROM build AS publish
# publish already compiles the project. No --no-restore on purpose: the restore layer above can stay cached
# while the NuGet cache mount is gone (e.g. after Docker Desktop restarts), which fails with NETSDK1064.
# When packages are already present, this restore is a fast no-op; when missing, it fetches them again.
RUN --mount=type=cache,target=/root/.nuget/packages dotnet publish "WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
# TẠM BỎ công cụ xuất PDF để build nhanh. Chức năng xuất PDF hợp đồng (Flow 1) và PDF bàn giao (Flow 6) sẽ báo lỗi
# 503/501 cho tới khi được thêm lại. Để thêm lại, khôi phục các bước cài `chromium libreoffice-writer fonts-liberation
# fonts-noto-core`, biến Flow1__Contracts__BrowserExecutablePath=/usr/bin/chromium, Flow1__Contracts__DisableBrowserSandbox=true
# và lệnh COPY WebApi/Resources/Contracts/99-flow1-vietnamese.conf /etc/fonts/conf.d/ (xem lịch sử git của file này).
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WebApi.dll"]

