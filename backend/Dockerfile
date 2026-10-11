FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files to restore dependencies
COPY ["RaceHorse_Transport_WebApi/RaceHorse_Transport_WebApi.csproj", "RaceHorse_Transport_WebApi/"]
COPY ["RaceHorse_Transport_Application/RaceHorse_Transport_Application.csproj", "RaceHorse_Transport_Application/"]
COPY ["RaceHorse_Transport_Domain/RaceHorse_Transport_Domain.csproj", "RaceHorse_Transport_Domain/"]
COPY ["RaceHorse_Transport_Infrastructure/RaceHorse_Transport_Infrastructure.csproj", "RaceHorse_Transport_Infrastructure/"]
RUN dotnet restore "RaceHorse_Transport_WebApi/RaceHorse_Transport_WebApi.csproj"

# Copy the rest of the source code
COPY . .
WORKDIR "/src/RaceHorse_Transport_WebApi"
RUN dotnet build "RaceHorse_Transport_WebApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RaceHorse_Transport_WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RaceHorse_Transport_WebApi.dll"]
