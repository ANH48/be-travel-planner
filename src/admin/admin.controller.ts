import { Controller, Get, Post, Body, Res, UseGuards, Req, Query, Param, Put, Delete } from '@nestjs/common';
import { Response, Request } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { AuthService } from '../auth/auth.service';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private authService: AuthService,
  ) {}

  @Get('login')
  getLoginPage(@Res() res: Response) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Login</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
          }
          h1 {
            text-align: center;
            color: #333;
            margin-bottom: 2rem;
          }
          .form-group {
            margin-bottom: 1rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            box-sizing: border-box;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
          }
          button:hover {
            background: #5568d3;
          }
          .error {
            color: #e74c3c;
            margin-top: 1rem;
            text-align: center;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>🔐 Admin Login</h1>
          <form id="loginForm">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Login</button>
            <div class="error" id="error"></div>
          </form>
        </div>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            try {
              const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              if (response.ok) {
                window.location.href = '/api/admin/dashboard';
              } else {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Invalid credentials';
              }
            } catch (err) {
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Login failed';
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  @Post('login')
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto);
      // Set token in cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  }

  @Get('dashboard')
  @UseGuards(AdminGuard)
  async getDashboard(@Res() res: Response) {
    const stats = await this.adminService.getDashboardStats();
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .header {
            background: #667eea;
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .stat-card h3 {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
          }
          .stat-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
          }
          .nav-links {
            display: flex;
            gap: 1rem;
          }
          .nav-links a {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
          }
          .nav-links a:hover {
            background: rgba(255,255,255,0.3);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Admin Dashboard</h1>
          <div class="nav-links">
            <a href="/api/admin/users">Users</a>
            <a href="/api/admin/trips">Trips</a>
            <a href="/api/admin/logout">Logout</a>
          </div>
        </div>
        <div class="container">
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Total Users</h3>
              <div class="number">${stats.totalUsers}</div>
            </div>
            <div class="stat-card">
              <h3>Total Trips</h3>
              <div class="number">${stats.totalTrips}</div>
            </div>
            <div class="stat-card">
              <h3>Total Expenses</h3>
              <div class="number">${stats.totalExpenses}</div>
            </div>
            <div class="stat-card">
              <h3>Total Amount</h3>
              <div class="number">$${Number(stats.totalAmount).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  @Get('users')
  @UseGuards(AdminGuard)
  async getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('users/:id')
  @UseGuards(AdminGuard)
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @UseGuards(AdminGuard)
  async createUser(@Body() dto: any) {
    return this.adminService.createUser(dto);
  }

  @Put('users/:id')
  @UseGuards(AdminGuard)
  async updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @UseGuards(AdminGuard)
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('trips')
  @UseGuards(AdminGuard)
  async getTrips() {
    const trips = await this.adminService.getAllTrips();
    return { trips };
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('token');
    res.redirect('/api/admin/login');
  }
}
