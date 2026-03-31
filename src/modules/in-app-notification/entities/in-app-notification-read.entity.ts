import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { InAppNotificationCampaign } from './in-app-notification-campaign.entity';

@Entity('UserNotifications')
@Unique('UQ_user_notification_read', ['user_id', 'notification_id'])
export class InAppNotificationRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  notification_id: string;

  @ManyToOne(() => InAppNotificationCampaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  campaign?: InAppNotificationCampaign;

  @Column({ type: 'uuid' })
  user_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  read_at: Date;
}
