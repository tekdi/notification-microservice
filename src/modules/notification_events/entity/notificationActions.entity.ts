// NotificationTemplates.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationActionTemplates } from './notificationActionTemplates.entity';

@Entity('NotificationActions')
export class NotificationActions {
    @PrimaryGeneratedColumn()
    actionId: number;

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

    @OneToMany(() => NotificationActionTemplates, templateconfig => templateconfig.template, { cascade: true })
    templateconfig: NotificationActionTemplates[];
}
