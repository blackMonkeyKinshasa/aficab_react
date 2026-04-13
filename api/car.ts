import { apiFetch } from './apiConfig';
import { CarStatus, ResType } from '@/constants/databaseEnum';

type CarListStatus = CarStatus | 'AVAILABLE';
type CarSortPrice = 'asc' | 'desc';

export type GetCarsParams = {
  search?: string;
  categoryId?: string;
  status?: CarListStatus;
  typeRes?: ResType;
  startDate?: Date | string;
  endDate?: Date | string;
  sortPrice?: CarSortPrice;
  mileage?: number;
  isAdmin?: boolean;
  organizationId?: string;
  page?: number;
};

function formatRequiredDateParam(value: Date | string | undefined, paramName: 'startDate' | 'endDate') {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Le parametre ${paramName} est invalide.`);
    }

    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  throw new Error(`Le parametre ${paramName} est obligatoire pour /car-algo.`);
}

function formatOptionalDateParam(value: Date | string | undefined, paramName: 'startDate' | 'endDate') {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Le parametre ${paramName} est invalide.`);
    }

    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  throw new Error(`Le parametre ${paramName} est invalide.`);
}

function buildCarQuery(params: GetCarsParams = {}) {
  if (!params.typeRes) {
    throw new Error('Le parametre typeRes est obligatoire pour /car-algo.');
  }

  const normalizedStartDate = formatRequiredDateParam(params.startDate, 'startDate');
  const normalizedEndDate = formatOptionalDateParam(params.endDate, 'endDate');
  const searchParams = new URLSearchParams();
  const normalizedParams: Record<string, string | number | boolean> = {
    typeRes: params.typeRes,
    startDate: normalizedStartDate,
    ...(params.search ? { search: params.search } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.sortPrice ? { sortPrice: params.sortPrice } : {}),
    ...(typeof params.mileage === 'number' ? { mileage: params.mileage } : {}),
    ...(typeof params.isAdmin === 'boolean' ? { isAdmin: params.isAdmin } : {}),
    ...(params.organizationId ? { organizationId: params.organizationId } : {}),
    ...(typeof params.page === 'number' ? { page: params.page } : {}),
    ...(normalizedEndDate ? { endDate: normalizedEndDate } : {}),
  };

  Object.entries(normalizedParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `/car-algo?${query}` : '/car-algo';
}

export function getCars(params: GetCarsParams = {}, token?: string) {
  return apiFetch(buildCarQuery(params), token, { method: 'GET' });
}

// GET /car?typeRes=LOC&status=AVAILABLE
export function getLocCars(token?: string, params: Omit<GetCarsParams, 'typeRes'> = {}) {
  return getCars(
    {
      ...params,
      typeRes: ResType.LOC,
      status: params.status ?? 'AVAILABLE',
    },
    token
  );
}

// GET /car?typeRes=TA&status=AVAILABLE
export function getTaCars(token?: string, params: Omit<GetCarsParams, 'typeRes'> = {}) {
  return getCars(
    {
      ...params,
      typeRes: ResType.TA,
      status: params.status ?? 'AVAILABLE',
    },
    token
  );
}

// GET /car (liste filtrable de toutes les voitures)
export function getAllCars(token?: string, params: GetCarsParams = {}) {
  return getCars(params, token);
}

// GET /car?isAdmin=true&organizationId=...
export function getAdminCars(organizationId: string, token?: string, params: Omit<GetCarsParams, 'isAdmin' | 'organizationId'> = {}) {
  return getCars(
    {
      ...params,
      isAdmin: true,
      organizationId,
    },
    token
  );
}

// GET /car/:cid  (détail d'une voiture)
export function getCarById(carId: string, token?: string) {
  return apiFetch(`/car/${carId}`, token, { method: 'GET' });
}

// GET /car/category
export function getAllCarCategories(token?: string) {
  return apiFetch('/car/category', token, { method: 'GET' });
}