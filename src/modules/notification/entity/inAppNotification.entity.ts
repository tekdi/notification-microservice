import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'notificationInApp' })
@Index('idx_inapp_user_created', ['userId', 'createdAt'])
@Index('idx_inapp_user_isread_created', ['userId', 'isRead', 'createdAt'])
@Index('idx_inapp_expires_at', ['expiresAt'])
export class InAppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @BeforeInsert()
  setId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ name: 'tenant_code', type: 'varchar', length: 255, nullable: true })
  tenant_code?: string;

  @Column({ name: 'org_code', type: 'varchar', length: 255, nullable: true })
  org_code?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  context?: string;

  @Column({ name: 'action_key', type: 'varchar', length: 255, nullable: true })
  actionKey?: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  // removed: source, template_params, action_id (not needed)
}


