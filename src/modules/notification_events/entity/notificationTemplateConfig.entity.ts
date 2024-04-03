// NotificationTemplateConfig.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

    @Column({ default: () => 'now()' })
    createdOn: Date;

    @Column({ default: () => 'now()' })
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
