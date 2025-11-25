import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      {
        name: 'whatsapp:webhook',
        adapter: BullMQAdapter,
      },
      {
        name: 'whatsapp:message-status',
        adapter: BullMQAdapter,
      },
      {
        name: 'booking:reminder',
        adapter: BullMQAdapter,
      },
      {
        name: 'notification:email',
        adapter: BullMQAdapter,
      },
    ),
  ],
})
export class BullBoardConfigModule {}
