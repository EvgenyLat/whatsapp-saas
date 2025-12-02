import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@database/prisma.service';
import { WebhookJobData } from '../queue.service';
import { AIService } from '@modules/ai/ai.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Processor('whatsapp:webhook', {
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 1000,
  },
})
export class WhatsappWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly whatsappService: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<any> {
    const { salonId, payload, receivedAt } = job.data;

    this.logger.debug(`Processing webhook for salon ${salonId} (Job ${job.id})`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // Extract webhook entry data
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        this.logger.warn(`Invalid webhook payload for job ${job.id}`);
        return { success: false, reason: 'Invalid payload' };
      }

      await job.updateProgress(30);

      // Process messages
      if (value.messages && value.messages.length > 0) {
        await this.processIncomingMessages(salonId, value.messages);
        await job.updateProgress(60);
      }

      // Process status updates
      if (value.statuses && value.statuses.length > 0) {
        await this.processStatusUpdates(salonId, value.statuses);
        await job.updateProgress(80);
      }

      // Log webhook processing
      await this.logWebhookProcessing(salonId, payload, 'SUCCESS');
      await job.updateProgress(100);

      this.logger.log(`Successfully processed webhook for salon ${salonId}`);

      return {
        success: true,
        messagesProcessed: value.messages?.length || 0,
        statusesProcessed: value.statuses?.length || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook for salon ${salonId}: ${error.message}`,
        error.stack,
      );

      await this.logWebhookProcessing(salonId, payload, 'FAILED', error.message);

      throw error; // BullMQ will handle retry
    }
  }

  private async processIncomingMessages(salonId: string, messages: any[]): Promise<void> {
    for (const message of messages) {
      try {
        const customerPhone = message.from;

        // Find or create conversation
        let conversation = await this.prisma.conversation.findFirst({
          where: {
            salon_id: salonId,
            phone_number: customerPhone,
          },
        });

        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              salon_id: salonId,
              phone_number: customerPhone,
              status: 'ACTIVE',
            },
          });
        }

        // Create message record
        await this.prisma.message.create({
          data: {
            conversation_id: conversation.id,
            salon_id: salonId,
            phone_number: customerPhone,
            whatsapp_id: message.id,
            direction: 'INBOUND',
            message_type: message.type || 'text',
            content: this.extractMessageContent(message),
            status: 'RECEIVED',
            metadata: message,
          },
        });

        // Update conversation last activity
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            last_message_at: new Date(),
            status: 'ACTIVE',
          },
        });

        this.logger.debug(`Processed incoming message ${message.id} for salon ${salonId}`);

        // 🤖 AI BOT: Process message with AI if it's a text message
        const messageContent = this.extractMessageContent(message);
        if (
          message.type === 'text' &&
          messageContent &&
          messageContent !== '[Unknown Message Type]'
        ) {
          try {
            this.logger.log(`🤖 AI processing message from ${customerPhone}`);

            // Call AI Service
            const aiResponse = await this.aiService.processMessage({
              salon_id: salonId,
              phone_number: customerPhone,
              message: messageContent,
              conversation_id: conversation.id,
            });

            this.logger.log(
              `✅ AI generated response: "${aiResponse.response.substring(0, 50)}..."`,
            );
            this.logger.log(
              `💰 Cost: $${aiResponse.cost.toFixed(4)}, Tokens: ${aiResponse.tokens_used}`,
            );

            // Send AI response via WhatsApp
            const salon = await this.prisma.salon.findUnique({
              where: { id: salonId },
              select: {
                phone_number_id: true,
                access_token: true,
              },
            });

            if (salon?.phone_number_id && salon?.access_token) {
              // Send AI response using system context (no userId needed for AI bot)
              await this.whatsappService.sendTextMessage('system', {
                salon_id: salonId,
                to: customerPhone,
                text: aiResponse.response,
              });

              // Store AI response as outbound message
              await this.prisma.message.create({
                data: {
                  conversation_id: conversation.id,
                  salon_id: salonId,
                  phone_number: customerPhone,
                  direction: 'OUTBOUND',
                  message_type: 'text',
                  content: aiResponse.response,
                  status: 'SENT',
                  metadata: {
                    ai_generated: true,
                    tokens_used: aiResponse.tokens_used,
                    cost: aiResponse.cost,
                    booking_code: aiResponse.booking_code,
                  },
                },
              });

              this.logger.log(`📤 AI response sent to ${customerPhone}`);
            } else {
              this.logger.warn(
                `⚠️ Cannot send AI response: Salon ${salonId} missing WhatsApp credentials`,
              );
            }
          } catch (aiError) {
            this.logger.error(`❌ AI processing failed: ${aiError.message}`);
            // Continue without AI response - message is still logged
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process message ${message.id}: ${error.message}`);
      }
    }
  }

  private async processStatusUpdates(salonId: string, statuses: any[]): Promise<void> {
    for (const status of statuses) {
      try {
        // First, get the current message to access its metadata
        const currentMessage = await this.prisma.message.findFirst({
          where: {
            salon_id: salonId,
            whatsapp_id: status.id,
          },
          select: { metadata: true },
        });

        await this.prisma.message.updateMany({
          where: {
            salon_id: salonId,
            whatsapp_id: status.id,
          },
          data: {
            status: status.status?.toUpperCase(),
            metadata: {
              ...(typeof currentMessage?.metadata === 'object' && currentMessage.metadata !== null
                ? currentMessage.metadata
                : {}),
              ...status,
            },
          },
        });

        this.logger.debug(`Updated message status for ${status.id}: ${status.status}`);
      } catch (error) {
        this.logger.error(`Failed to update message status ${status.id}: ${error.message}`);
      }
    }
  }

  private extractMessageContent(message: any): string {
    if (message.text) {
      return message.text.body;
    } else if (message.image) {
      return '[Image]';
    } else if (message.document) {
      return '[Document]';
    } else if (message.audio) {
      return '[Audio]';
    } else if (message.video) {
      return '[Video]';
    } else if (message.location) {
      return '[Location]';
    } else if (message.contacts) {
      return '[Contact]';
    }
    return '[Unknown Message Type]';
  }

  private async logWebhookProcessing(
    salonId: string,
    payload: any,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      // Log to database or monitoring system
      this.logger.debug(`Webhook ${status} for salon ${salonId}${error ? `: ${error}` : ''}`);

      // You can add database logging here if needed
      // await this.prisma.webhookLog.create({ ... });
    } catch (logError) {
      this.logger.error(`Failed to log webhook: ${logError.message}`);
    }
  }
}
