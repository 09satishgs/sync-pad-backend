const { ERRORS, MESSAGES } = require('../constants/constants');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(req, res) {
    const { username, password } = req.body;
    try {
      const result = await this.authService.register(username, password);
      return res.status(201).json(result);
    } catch (error) {
      console.error('Registration error:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  async login(req, res) {
    const { username, password } = req.body;
    try {
      const { token, user } = await this.authService.login(username, password);

      const cookieOptions = {
        httpOnly: true,
        secure: true, // Required for SameSite=None
        sameSite: 'none', // Needed because Vercel frontend is on a different domain
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      };

      res.cookie('token', token, cookieOptions);
      return res.json({
        message: MESSAGES.LOGIN_SUCCESS,
        user
      });
    } catch (error) {
      console.error('Login error:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }

  logout(req, res) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    return res.json({ message: MESSAGES.LOGOUT_SUCCESS });
  }

  session(req, res) {
    return res.json({ user: req.user });
  }

  async refreshSession(req, res) {
    try {
      const { token, user } = await this.authService.refreshSession(req.user.id);

      const cookieOptions = {
        httpOnly: true,
        secure: true, // Required for SameSite=None
        sameSite: 'none', // Needed because Vercel frontend is on a different domain
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      };

      res.cookie('token', token, cookieOptions);
      return res.json({
        message: MESSAGES.SESSION_REFRESH_SUCCESS,
        user
      });
    } catch (error) {
      console.error('Session refresh error:', error);
      const status = error.status || 500;
      const message = status === 500 ? ERRORS.INTERNAL_SERVER_ERROR : error.message;
      return res.status(status).json({ message });
    }
  }
}

module.exports = AuthController;
