# Historical test compatibility

These scalar services preserve the pre-Reviewed direct-service fixtures in tests/Flow1.Tests. They are not registered by ServiceRegistration and have no controllers or runtime routes. The application uses Application/Flow1/Services with the Reviewed context instead. Mock deposit/sign entry points and fixed OTP bypasses have been removed even here. Keep only while migrating the old test cases; do not register these classes in a running host.
