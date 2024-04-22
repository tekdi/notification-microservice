// NotificationTemplates.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationTemplateConfig } from './notificationTemplateConfig.entity';

@Entity('NotificationTemplates')
export class NotificationTemplates {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdOn: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedOn: Date;

    @Column()
    key: string;

    @Column()
    status: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;

    @Column()
    context: string;

    @Column({ type: 'jsonb', nullable: true })
    replacementTags: any

    @OneToMany(() => NotificationTemplateConfig, templateconfig => templateconfig.template)
    templateconfig: NotificationTemplateConfig[];
}
