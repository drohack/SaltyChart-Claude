import { apiFetch } from './client';
import { User, Season } from '../types';

export function getUsers(): Promise<User[]> {
  return apiFetch('/api/users');
}

export function getUsersWithSeason(season: Season, year: number): Promise<User[]> {
  return apiFetch(`/api/users/with-season?season=${season}&year=${year}`);
}

export function getUsersWithNicknames(): Promise<User[]> {
  return apiFetch('/api/users/with-nicknames');
}
