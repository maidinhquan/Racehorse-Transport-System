# Retained Flow1 regression/operator support

This library is referenced by tests and offline legacy tools ONLY. None of Domain,
Application, Infrastructure or WebApi references it; it must never be registered or
shipped as the active Flow1 API. Runtime uses the complete typed006 model.

The old store/services/controllers remain here to exercise historical regression
and interpret old evidence during reviewed conversion. This is code retention,
not a JSON fallback or a new data store. Original business/private source files are
not moved or deleted. Do not run the old004 importer as a step toward006.

Legacy MVC controllers are added explicitly by the historical test factory and
removed by the active API's controller selection. No configuration flag in the
production app enables them. Use the relational harness for new acceptance.
