import { Request, Response } from 'express';

export class DashboardController {
  
  /**
   * Render main dashboard page
   */
  renderDashboard = (req: Request, res: Response): void => {
    res.render('dashboard/index', {
      title: 'Dashboard - Colabi',
      currentPage: 'dashboard',
      layout:'dashboard/layout'
    });
  };

  /**
   * Render messages page
   */
  renderMessages = (req: Request, res: Response): void => {
    res.render('dashboard/messages', {
      title: 'Messages - Colabi',
      currentPage: 'messages'
    });
  };

  /**
   * Render accounts page
   */
  renderAccounts = (req: Request, res: Response): void => {
    res.render('dashboard/accounts', {
      title: 'Accounts - Colabi',
      currentPage: 'accounts'
    });
  };

  /**
   * Render analytics page
   */
  renderAnalytics = (req: Request, res: Response): void => {
    res.render('dashboard/analytics', {
      title: 'Analytics - Colabi',
      currentPage: 'analytics'
    });
  };

  /**
   * Render settings page
   */
  renderSettings = (req: Request, res: Response): void => {
    res.render('dashboard/settings', {
      title: 'Settings - Colabi',
      currentPage: 'settings'
    });
  };
}