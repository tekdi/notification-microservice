// NotificationTemplates.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { NotificationTemplateConfig } from './notificationTemplateConfig.entity';

@Entity('NotificationTemplates')
export class NotificationTemplates {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ default: () => 'now()' })
    createdOn: Date;

    @Column({ default: () => 'now()' })
    updatedOn: Date;

    @Column()
    key: string;

    @Column()
    status: string;

    @Column()
    createdBy: string;

    @Column()
    updatedBy: string;

    @Column()
    context: string;

    @Column('jsonb')
    replacement: Record<string, any>;

    @OneToMany(() => NotificationTemplateConfig, templateconfig => templateconfig.template)
    templateconfig: NotificationTemplateConfig[];
}
