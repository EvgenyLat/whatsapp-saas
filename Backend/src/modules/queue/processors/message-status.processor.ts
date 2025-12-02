import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { MessageStatusJobData } from '../queue.service';

@Processor('whatsapp:message-status', {
  concurrency: 10,
  limiter: {
    max: 50,
    duration: 1000,
  },
})
export class MessageStatusProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageStatusProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<MessageStatusJobData>): Promise<any> {
    const { messageId, status, timestamp, errorCode, errorMessage } = job.data;

    this.logger.debug(`Processing message status update: ${messageId} -> ${status}`);

    try {
      // First, get the current message to access its metadata
      const currentMessage = await this.prisma.message.findFirst({
        where: {
          whatsapp_id: messageId,
        },
        select: { metadata: true },
      });

      // Update message status in database
      const updated = await this.prisma.message.updateMany({
        where: {
          whatsapp_id: messageId,
        },
        data: {
          status: status.toUpperCase(),
          metadata: {
            ...(typeof currentMessage?.metadata === 'object' && currentMessage.metadata !== null
              ? currentMessage.metadata
              : {}),
            ...(errorCode && { errorCode }),
            ...(errorMessage && { errorMessage }),
            statusUpdatedAt: new Date(timestamp).toISOString(),
          },
        },
      });

      if (updated.count === 0) {
        this.logger.warn(`No message found with whatsapp_message_id: ${messageId}`);
        return { success: false, reason: 'Message not found' };
      }

      // If message failed, log additional details
      if (status === 'FAILED' && errorCode) {
        this.logger.error(`Message ${messageId} failed with error ${errorCode}: ${errorMessage}`);

        // You can add additional error handling here
        // e.g., notify admin, mark conversation for review, etc.
      }

      // If message was delivered or read, update conversation
      if (status === 'DELIVERED' || status === 'READ') {
        const message = await this.prisma.message.findFirst({
          where: { whatsapp_id: messageId },
          select: { conversation_id: true },
        });

        if (message?.conversation_id) {
          await this.prisma.conversation.update({
            where: { id: message.conversation_id },
            data: { last_message_at: new Date(timestamp) },
          });
        }
      }

      this.logger.debug(`Successfully updated status for message ${messageId} to ${status}`);

      return {
        success: true,
        messageId,
        status,
        updatedCount: updated.count,
      };
    } catch (error) {
      this.logger.error(`Failed to update message status: ${error.message}`, error.stack);
      throw error;
    }
  }
}
