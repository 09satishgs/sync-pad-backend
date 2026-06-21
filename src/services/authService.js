const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ERRORS, MESSAGES } = require('../constants/constants');

class AuthService {
  constructor(userRepository, workspaceRepository) {
    this.userRepository = userRepository;
    this.workspaceRepository = workspaceRepository;
  }

  async register(username, password) {
    if (!username || !password) {
      const error = new Error(ERRORS.USERNAME_PASSWORD_REQUIRED);
      error.status = 400;
      throw error;
    }

    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      const error = new Error(ERRORS.USERNAME_TAKEN);
      error.status = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await this.userRepository.create(username, passwordHash);
    return { message: MESSAGES.USER_REGISTERED_SUCCESS };
  }

  async login(username, password) {
    if (!username || !password) {
      const error = new Error(ERRORS.USERNAME_PASSWORD_REQUIRED);
      error.status = 400;
      throw error;
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      const error = new Error(ERRORS.INVALID_CREDENTIALS);
      error.status = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error(ERRORS.INVALID_CREDENTIALS);
      error.status = 401;
      throw error;
    }

    // Fetch user roles details
    const roleIds = user.role_ids ? user.role_ids.split(',').map(Number) : [];
    const roles = await this.workspaceRepository.findRolesByIds(roleIds);

    const token = jwt.sign(
      { id: user.id, username: user.username, roles },
      process.env.JWT_SECRET || 'dev_jwt_secret_key_sync_pad_12345',
      { expiresIn: '30d' }
    );

    return {
      token,
      user: { id: user.id, username: user.username, roles }
    };
  }

  async refreshSession(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error(ERRORS.USER_NOT_FOUND);
      error.status = 404;
      throw error;
    }

    const roleIds = user.role_ids ? user.role_ids.split(',').map(Number) : [];
    const roles = await this.workspaceRepository.findRolesByIds(roleIds);

    const token = jwt.sign(
      { id: user.id, username: user.username, roles },
      process.env.JWT_SECRET || 'dev_jwt_secret_key_sync_pad_12345',
      { expiresIn: '30d' }
    );

    return {
      token,
      user: { id: user.id, username: user.username, roles }
    };
  }
}

module.exports = AuthService;
