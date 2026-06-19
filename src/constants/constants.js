module.exports = {
  // HTTP status messages
  ERRORS: {
    INTERNAL_SERVER_ERROR: 'Internal server error.',
    UNAUTHORIZED_NO_TOKEN: 'Unauthorized: No token provided.',
    UNAUTHORIZED_INVALID_TOKEN: 'Unauthorized: Invalid token.',
    USERNAME_PASSWORD_REQUIRED: 'Username and password are required.',
    USERNAME_TAKEN: 'Username already taken.',
    INVALID_CREDENTIALS: 'Invalid username or password.',
    CONTENT_REQUIRED: 'Content is required.',
    TITLE_REQUIRED: 'Title is required.',
    TITLE_REQUIRED_TO_SAVE: 'Title is required to save sheet.',
    TITLE_REQUIRED_TO_ARCHIVE: 'Title is required to archive sheet.',
    NO_ACTIVE_LIVE_SHEET_TO_SAVE: 'No active live sheet to save.',
    NO_ACTIVE_LIVE_SHEET_TO_ARCHIVE: 'No active live sheet to archive.',
    SAVED_SHEET_NOT_FOUND: 'Saved sheet not found.',
    CONFLICT_DETECTED: 'Conflict detected. This sheet has been updated on another device.',
    SHEET_NOT_FOUND: 'Sheet not found.',
    CATEGORY_NAME_REQUIRED: 'Category name is required.',
    CATEGORY_ALREADY_EXISTS: 'Category already exists.',
    CATEGORY_NOT_FOUND: 'Category not found.'
  },
  MESSAGES: {
    USER_REGISTERED_SUCCESS: 'User registered successfully.',
    LOGIN_SUCCESS: 'Login successful.',
    LOGOUT_SUCCESS: 'Logged out successfully.',
    SHEET_SAVED_SUCCESS: 'Sheet saved successfully. New live sheet created.',
    SHEET_ARCHIVED_SUCCESS: 'Sheet archived successfully. New live sheet created.',
    LIVE_SHEET_DELETED: 'Live sheet deleted. Started a new blank sheet.',
    SHEET_DELETED_SUCCESS: 'Sheet deleted successfully.',
    SHEET_LOADED_SUCCESS: 'Sheet loaded into live space.',
    CATEGORY_DELETED_SUCCESS: 'Category deleted successfully.',
    AUTO_ARCHIVE_MESSAGE: 'The previous live sheet expired and was auto-archived.',
    AUTO_DELETE_MESSAGE: 'The previous live sheet expired and was deleted.'
  }
};
