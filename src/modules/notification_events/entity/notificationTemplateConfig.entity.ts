// NotificationTemplateConfig.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationTemplates } from './notificationTemplate.entity';

@Entity('NotificationTemplateConfig')
export class NotificationTemplateConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    language: string;

    @Column()
    subject: string;

    @Column()
    body: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdOn: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedOn: Date;

    @Column()
    status: string;

    @Column()
    createdBy: string;

    @Column()
    updatedBy: string;

    @Column()
    template_id: number;

    @ManyToOne(() => NotificationTemplates, template => template.templateconfig)
    @JoinColumn({ name: 'template_id' })
    template: NotificationTemplates;

    @Column()
    type: string;
}
