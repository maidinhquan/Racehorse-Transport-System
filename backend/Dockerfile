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
# publish already compiles the project, so a separate `dotnet build` step only doubled the build time
RUN --mount=type=cache,target=/root/.nuget/packages dotnet publish "WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium libreoffice-writer fonts-liberation fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*
ENV Flow1__Contracts__BrowserExecutablePath=/usr/bin/chromium \
    Flow1__Contracts__DisableBrowserSandbox=true
WORKDIR /app
COPY --from=publish /app/publish .
COPY WebApi/Resources/Contracts/99-flow1-vietnamese.conf /etc/fonts/conf.d/99-flow1-vietnamese.conf
ENTRYPOINT ["dotnet", "WebApi.dll"]
