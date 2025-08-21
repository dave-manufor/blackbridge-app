const StatusCodes = {
  /**
   * 200 - Use for general success responses
   */
  OK: 200,
  /**
   * 201 - Use for successful creation of a resource
   */
  CREATED: 201,
  /**
   * 202 - Use for successful update of a resource
   */
  ACCEPTED: 202,
  /**
   * 204 - Use for successful deletion of a resource
   */
  NO_CONTENT: 204,
  /**
   * 400 - Use for validation errors or bad requests
   */
  BAD_REQUEST: 400,
  /**
   * 401 - Use for authentication errors
   */
  UNAUTHORIZED: 401,
  /**
   * 403 - Use for insufficient permissions
   */
  FORBIDDEN: 403,
  /**
   * 404 - Use when a resource is not found
   */
  NOT_FOUND: 404,
  /**
   * 409 - Use when a resource already exists or a conflict occurs
   */
  CONFLICT: 409,
  /**
   * 429 - Use when a user has sent too many requests in a given amount of time
   */
  TOO_MANY_REQUESTS: 429,
  /**
   * 500 - Use for server errors or unexpected conditions
   */
  INTERNAL_SERVER_ERROR: 500,
  /**
   * 501 - Use when a feature is not implemented
   */
  NOT_IMPLEMENTED: 501,
};

export default StatusCodes;
