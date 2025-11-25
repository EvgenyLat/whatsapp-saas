import { Master as PrismaMaster } from '@prisma/client';

export class Master implements PrismaMaster {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: string[];
  working_hours: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
