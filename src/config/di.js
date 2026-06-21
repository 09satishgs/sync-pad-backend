const UserRepository = require('../repositories/userRepository');
const SheetRepository = require('../repositories/sheetRepository');
const CategoryRepository = require('../repositories/categoryRepository');
const WorkspaceRepository = require('../repositories/workspaceRepository');
const AdminRepository = require('../repositories/adminRepository');

const AuthService = require('../services/authService');
const SheetService = require('../services/sheetService');
const CategoryService = require('../services/categoryService');
const WorkspaceService = require('../services/workspaceService');
const AdminService = require('../services/adminService');

const AuthController = require('../controllers/authController');
const SheetController = require('../controllers/sheetController');
const CategoryController = require('../controllers/categoryController');
const WorkspaceController = require('../controllers/workspaceController');
const AdminController = require('../controllers/adminController');

// 1. Instantiate Repositories
const userRepository = new UserRepository();
const sheetRepository = new SheetRepository();
const categoryRepository = new CategoryRepository();
const workspaceRepository = new WorkspaceRepository();
const adminRepository = new AdminRepository();

// 2. Instantiate Services and inject dependencies
const workspaceService = new WorkspaceService(workspaceRepository, userRepository);
const authService = new AuthService(userRepository, workspaceRepository);
const sheetService = new SheetService(sheetRepository, categoryRepository, workspaceService);
const categoryService = new CategoryService(categoryRepository, workspaceService);
const adminService = new AdminService(adminRepository, workspaceRepository, userRepository);

// 3. Instantiate Controllers and inject dependencies
const authController = new AuthController(authService);
const sheetController = new SheetController(sheetService);
const categoryController = new CategoryController(categoryService);
const workspaceController = new WorkspaceController(workspaceService);
const adminController = new AdminController(adminService);

module.exports = {
  userRepository,
  sheetRepository,
  categoryRepository,
  workspaceRepository,
  adminRepository,
  authService,
  sheetService,
  categoryService,
  workspaceService,
  adminService,
  authController,
  sheetController,
  categoryController,
  workspaceController,
  adminController
};
