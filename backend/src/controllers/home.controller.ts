import logger from '../lib/logger';
import express, { Request, Response } from 'express';

class HomeController {
  public path = '/';
  public router = express.Router();
  public homeLogger = logger.child({ module: 'Home Controller' });

  constructor() {
    this.initializeRoutes();
    this.homeLogger.trace('Home Controller initialized');
  }

  private initializeRoutes() {
    this.router.get('/', this.home);
    this.router.get('/health', this.health);
  }

  private home(req: Request, res: Response) {
    res.send('Server is up!');
  }

  private health(req: Request, res: Response) {
    res.status(200).send();
  }
}

export default HomeController;
