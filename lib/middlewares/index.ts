import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/User';

async function isBlocked(req: Request, res: Response, next: NextFunction) {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) return res.sendStatus(401);

    const user = await UserService.findById(userId);

    if (!user || user.isBlocked) return res.sendStatus(401);

    // @ts-ignore
    req['currentUser'] = user;
    next();
  } catch (error) {
    console.error('Error in IsBlockedGuard:', error);
    res.sendStatus(500);
  }
}
async function tokenBlacklist(req: Request, res: Response, next: NextFunction) {
  try {
    // @ts-ignore
    const accessToken = req.user?.accessToken;

    const tokenInBlackList =  await UserService.tokenInBlackList(accessToken);

    if (tokenInBlackList) return res.sendStatus(401);

    next();
  } catch (error) {
    console.error('Error in TokenBlacklistGuard:', error);
    res.sendStatus(500);
  }
}


export  {
  isBlocked,
  tokenBlacklist
};
