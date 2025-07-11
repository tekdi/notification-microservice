// NotificationTemplateConfig.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationActions } from './notificationActions.entity';

@Entity('NotificationActionTemplates')
export class NotificationActionTemplates {
    @PrimaryGeneratedColumn('uuid')
    templateId: string;

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

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column({ nullable: true })
    image: string;

    @Column({ nullable: true })
    link: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;

    @Column()
    actionId: number;

    @ManyToOne(() => NotificationActions, template => template.templateconfig)
    @JoinColumn({ name: 'actionId' })
    template: NotificationActions;

    @Column()
    type: string;
}
