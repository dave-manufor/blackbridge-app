import express, { Request, Response } from 'express';
import db from '../services/db';
import StatusCodesConfig from '../config/StatusCodes.config';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';
import logger from '../lib/logger';
import { verifyToken } from '../middlewares/auth.middleware';

class AnalyticsController {
  public path = '/analytics';
  public router = express.Router();
  private analyticsLogger = logger.child({ module: 'Analytics Controller' });

  constructor() {
    this.initializeRoutes();
    this.analyticsLogger.trace('Analytics Controller initialized');
  }

  private initializeRoutes() {
    this.router.get('/overview', verifyToken(), this.getOverview);
  }

  private calculateTrend = (current: number, prior: number) => {
    if (prior === 0) return current > 0 ? 100 : 0;
    return Number((((current - prior) / prior) * 100).toFixed(1));
  };

  private getOverview = async (req: Request, res: Response) => {
    try {
      const { userId } = req.session;
      const timeframe = (req.query.timeframe as string) || '7d';
      let days = 7;
      if (timeframe === '30d') days = 30;
      if (timeframe === '90d') days = 90;

      const now = new Date();
      const currentPeriodStart = startOfDay(subDays(now, days - 1));
      const currentPeriodEnd = endOfDay(now);

      const priorPeriodStart = startOfDay(subDays(now, (days * 2) - 1));
      const priorPeriodEnd = endOfDay(subDays(now, days));

      // Fetch all transfers and files for both periods
      const [transfers, files, linkDownloads, emailDownloads] = await Promise.all([
        db.transfers.findMany({
          where: { owner_user_id: userId, created_at: { gte: priorPeriodStart, lte: currentPeriodEnd } },
          select: { id: true, created_at: true, transfer_type: true },
        }),
        db.files.findMany({
          where: { user_id: userId, created_at: { gte: priorPeriodStart, lte: currentPeriodEnd } },
          select: { size: true, created_at: true },
        }),
        db.linkTransferDownloads.findMany({
          where: { 
            link_transfer: { transfer: { owner_user_id: userId } }, 
            created_at: { gte: priorPeriodStart, lte: currentPeriodEnd } 
          },
          select: { created_at: true }
        }),
        db.emailTransfers.findMany({
          where: { 
            transfer: { owner_user_id: userId }, 
            downloaded: true, 
            downloaded_at: { gte: priorPeriodStart, lte: currentPeriodEnd } 
          },
          select: { downloaded_at: true }
        })
      ]);

      // Split into current and prior periods
      const isCurrent = (date: Date | null) => date && date >= currentPeriodStart && date <= currentPeriodEnd;
      const isPrior = (date: Date | null) => date && date >= priorPeriodStart && date <= priorPeriodEnd;

      const currentTransfers = transfers.filter(t => isCurrent(t.created_at));
      const priorTransfers = transfers.filter(t => isPrior(t.created_at));

      const currentFiles = files.filter(f => isCurrent(f.created_at));
      const priorFiles = files.filter(f => isPrior(f.created_at));

      const currentDownloads = linkDownloads.filter(l => isCurrent(l.created_at)).length + 
                               emailDownloads.filter(e => isCurrent(e.downloaded_at)).length;
      const priorDownloads = linkDownloads.filter(l => isPrior(l.created_at)).length + 
                             emailDownloads.filter(e => isPrior(e.downloaded_at)).length;

      // Calculate Totals
      const totalTransfers = currentTransfers.length;
      const totalStorage = currentFiles.reduce((sum, f) => sum + Number(f.size), 0);
      const priorStorage = priorFiles.reduce((sum, f) => sum + Number(f.size), 0);
      
      const totalBandwidth = currentDownloads * 0; // Simplified without real download size tracking, using storage proxy if needed

      // Time series generation
      const daysInterval = eachDayOfInterval({ start: currentPeriodStart, end: currentPeriodEnd });
      
      const chartData = daysInterval.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const isThisDay = (d: Date) => d >= dayStart && d <= dayEnd;

        const dayTransfers = currentTransfers.filter(t => isThisDay(t.created_at)).length;
        const daySize = currentFiles.filter(f => isThisDay(f.created_at)).reduce((sum, f) => sum + Number(f.size), 0);

        // Format label nicely based on timeframe
        const name = days <= 7 ? format(day, 'EEE') : format(day, 'MMM dd');
        
        return {
          name,
          transfers: dayTransfers,
          size: daySize,
        };
      });

      // Type Breakdown
      const typeBreakdown = {
        LINK: currentTransfers.filter(t => t.transfer_type === 'LINK').length,
        EMAIL: currentTransfers.filter(t => t.transfer_type === 'EMAIL').length,
      };

      res.status(StatusCodesConfig.OK).json({
        message: 'Analytics retrieved successfully',
        data: {
          totals: {
            transfers: totalTransfers,
            storage: totalStorage,
            downloads: currentDownloads,
          },
          trends: {
            transfers: this.calculateTrend(totalTransfers, priorTransfers.length),
            storage: this.calculateTrend(totalStorage, priorStorage),
            downloads: this.calculateTrend(currentDownloads, priorDownloads),
          },
          chartData,
          typeBreakdown: [
            { name: 'Link', transfers: typeBreakdown.LINK },
            { name: 'Email', transfers: typeBreakdown.EMAIL }
          ]
        }
      });
    } catch (error) {
      this.analyticsLogger.error(error, 'Error retrieving analytics overview');
      res.status(StatusCodesConfig.INTERNAL_SERVER_ERROR).json({
        message: 'Internal Server Error'
      });
    }
  };
}

export default AnalyticsController;
