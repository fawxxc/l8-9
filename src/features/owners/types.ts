// src/features/owners/types.ts

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
}

export interface OwnerBase {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export interface Owner extends OwnerBase {
  id: number;
  createdAt?: string;
  updatedAt?: string;
  pets?: Array<Pet>;
}

export type CreateOwnerDto = OwnerBase;

export type UpdateOwnerDto = Partial<OwnerBase>;
