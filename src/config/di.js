const UserRepository = require('../repositories/userRepository');
const SheetRepository = require('../repositories/sheetRepository');
const CategoryRepository = require('../repositories/categoryRepository');
const WorkspaceRepository = require('../repositories/workspaceRepository');
const AdminRepository = require('../repositories/adminRepository');
const FileRepository = require('../repositories/fileRepository');

const FileStorageService = require('../services/fileStorageService');
const AuthService = require('../services/authService');
const SheetService = require('../services/sheetService');
const CategoryService = require('../services/categoryService');
const WorkspaceService = require('../services/workspaceService');
const AdminService = require('../services/adminService');
const FileService = require('../services/fileService');

const AuthController = require('../controllers/authController');
const SheetController = require('../controllers/sheetController');
const CategoryController = require('../controllers/categoryController');
const WorkspaceController = require('../controllers/workspaceController');
const AdminController = require('../controllers/adminController');
const FileController = require('../controllers/fileController');

// 1. Instantiate Repositories
const userRepository = new UserRepository();
const sheetRepository = new SheetRepository();
const categoryRepository = new CategoryRepository();
const workspaceRepository = new WorkspaceRepository();
const adminRepository = new AdminRepository();
const fileRepository = new FileRepository();

// 2. Instantiate Storage Service
const fileStorageService = new FileStorageService();

// 3. Instantiate Services and inject dependencies
const workspaceService = new WorkspaceService(workspaceRepository, userRepository);
const authService = new AuthService(userRepository, workspaceRepository);
const sheetService = new SheetService(sheetRepository, categoryRepository, workspaceService, fileStorageService);
const categoryService = new CategoryService(categoryRepository, workspaceService);
const adminService = new AdminService(adminRepository, workspaceRepository, userRepository);
const fileService = new FileService(fileRepository, fileStorageService, workspaceService);

// 4. Instantiate Controllers and inject dependencies
const authController = new AuthController(authService);
const sheetController = new SheetController(sheetService);
const categoryController = new CategoryController(categoryService);
const workspaceController = new WorkspaceController(workspaceService);
const adminController = new AdminController(adminService);
const fileController = new FileController(fileService);

module.exports = {
  userRepository,
  sheetRepository,
  categoryRepository,
  workspaceRepository,
  adminRepository,
  fileRepository,
  fileStorageService,
  authService,
  sheetService,
  categoryService,
  workspaceService,
  adminService,
  fileService,
  authController,
  sheetController,
  categoryController,
  workspaceController,
  adminController,
  fileController
};
