# City-scoped address selection

1. `GET /api/locations/cities?q=Hanoi&country=VN` returns selectable provinces/cities/counties with a verified administrative polygon. Copy `cityId` unchanged. These are external Geoapify IDs, not internal `USER_`/`ROUTE_` sequence IDs.
2. `GET /api/locations/search?q=Hoan%20Kiem&country=VN&cityId=<returned-id>` is required to include `cityId`. Results are filtered by country and boundary, then independently checked with Geoapify Boundaries `part-of`. No boundary data means no successful verification; there is no country-wide fallback.
3. In `PUT /api/customer/requests/{id}`, include `pickup.cityId` and `delivery.cityId` along with coordinates. The backend verifies the actual coordinates before the write transaction. Wrong country returns `COUNTRY_MISMATCH`; outside the selected boundary returns `CITY_MISMATCH`. City labels are derived by the server and cannot be supplied by the client.
4. The four nullable columns `PickupCityId`, `PickupCityName`, `DeliveryCityId`, `DeliveryCityName` preserve the selected references and labels on the request. New contract snapshots include these values; existing published snapshots are not rewritten. There is no worldwide city master table or polygon import. City metadata is cached in memory for six hours; containment is checked against the provider on every save/search.

Geoapify encodings of a place ID can differ for the same boundary. Membership is compared using the provider's OSM object type and ID, rather than translated names, bounding rectangles, or raw place-ID string equality.

Current implementation requires Geoapify as the data provider. OSM/Mapbox adapters fail explicitly with `CITY_PROVIDER_UNSUPPORTED` for scoped operations; Mapbox can still render previews independently.

Deployment: recreate the test database from `HorseTransportDB/HorseTransportDB_Reviewed.sql`, which directly defines the four city columns. Complete POST/PUT request submissions require verified selections. There are no numbered migrations. Editing the schema file does not reset the running database.

The check proves that the selected coordinates belong to the selected administrative boundary. It does not prove that arbitrary free-text notes, a building name, or a manually typed address label accurately describes that point.
