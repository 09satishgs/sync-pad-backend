const UserRepository = require('../repositories/userRepository');
const SheetRepository = require('../repositories/sheetRepository');
const CategoryRepository = require('../repositories/categoryRepository');

const AuthService = require('../services/authService');
const SheetService = require('../services/sheetService');
const CategoryService = require('../services/categoryService');

const AuthController = require('../controllers/authController');
const SheetController = require('../controllers/sheetController');
const CategoryController = require('../controllers/categoryController');

// 1. Instantiate Repositories
const userRepository = new UserRepository();
const sheetRepository = new SheetRepository();
const categoryRepository = new CategoryRepository();

// 2. Instantiate Services and inject dependencies
const authService = new AuthService(userRepository);
const sheetService = new SheetService(sheetRepository, categoryRepository);
const categoryService = new CategoryService(categoryRepository);

// 3. Instantiate Controllers and inject dependencies
const authController = new AuthController(authService);
const sheetController = new SheetController(sheetService);
const categoryController = new CategoryController(categoryService);

module.exports = {
  userRepository,
  sheetRepository,
  categoryRepository,
  authService,
  sheetService,
  categoryService,
  authController,
  sheetController,
  categoryController
};
