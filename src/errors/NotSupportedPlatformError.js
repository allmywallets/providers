/**
 * NotSupportedPlatformError is thrown when the platform provided
 * is not supported
 */
class NotSupportedPlatformError extends Error {
  constructor (...parameters) {
    super(...parameters)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotSupportedPlatformError)
    }
  }
}

module.exports = NotSupportedPlatformError
