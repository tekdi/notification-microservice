// NotificationTemplateConfig.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationActions } from './notificationActions.entity';

@Entity('NotificationActionTemplates')
export class NotificationActionTemplates {
    @PrimaryGeneratedColumn('uuid')
    templateId: string;

    @Column()
    language: string;

    @Column({ nullable: false })
    subject: string;

    @Column({ nullable: false })
    body: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdOn: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedOn: Date;

    @Column()
    status: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column()
    image: string;

    @Column()
    link: string;


    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;

    @Column({ nullable: false })
    actionId: number;

    @ManyToOne(() => NotificationActions, template => template.templateconfig)
    @JoinColumn({ name: 'actionId' })
    template: NotificationActions;

    @Column()
    type: string;
}
