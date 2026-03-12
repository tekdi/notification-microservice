import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationActionTemplates } from '../../notification_events/entity/notificationActionTemplates.entity';

export type AudienceType = 'ALL_USERS' | 'COHORT' | 'ROLE' | 'USER_LIST';
export type NotificationType = 'ANNOUNCEMENT' | 'COURSE' | 'EVENT';

@Entity('NotificationCampaigns')
export class InAppNotificationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  template_id: string | null;

  @ManyToOne(() => NotificationActionTemplates, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: NotificationActionTemplates;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @Column({ type: 'varchar', length: 50 })
  notification_type: NotificationType;

  @Column({ type: 'varchar', length: 50 })
  audience_type: AudienceType;

  @Column({ type: 'jsonb', default: {} })
  audience_metadata: Record<string, unknown>;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;
}
