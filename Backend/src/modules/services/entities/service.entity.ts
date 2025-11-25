import { Service as PrismaService, ServiceCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class Service implements PrismaService {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: Decimal;
  category: ServiceCategory;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
