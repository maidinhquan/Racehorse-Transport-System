namespace Domain.Exceptions;

public sealed class DuplicateUserException(Exception? innerException = null)
    : Exception("Email hoặc số điện thoại đã được sử dụng.", innerException);
