import { SinceItem, RepeatUnit, ItemStatus } from '../../types';

export interface CreateItemInput {
  name: string;
  category: string;
  lastDoneDate: string;
  repeatValue: number | null;
  repeatUnit: RepeatUnit | null;
  notes?: string | null;
}

export interface UpdateItemInput {
  name?: string;
  category?: string;
  lastDoneDate?: string;
  repeatValue?: number | null;
  repeatUnit?: RepeatUnit | null;
  notes?: string | null;
}

export interface DerivedItem extends SinceItem {
  status: ItemStatus;
}
