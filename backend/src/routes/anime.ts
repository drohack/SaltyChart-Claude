import { Router, Request, Response, NextFunction } from 'express';
import { AnilistSeason, getSeasonAnime } from '../anilist';
import { AppError } from '../errors';

const router = Router();
const VALID_SEASONS = new Set<string>(['WINTER', 'SPRING', 'SUMMER', 'FALL']);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = req.query;

    if (typeof season !== 'string' || !VALID_SEASONS.has(season)) {
      throw new AppError(400, 'BAD_REQUEST', 'season must be WINTER, SPRING, SUMMER, or FALL');
    }
    const yearNum = parseInt(year as string, 10);
    if (!year || isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      throw new AppError(400, 'BAD_REQUEST', 'year must be a valid four-digit year');
    }

    const data = await getSeasonAnime(season as AnilistSeason, yearNum);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
