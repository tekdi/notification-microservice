import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'notificationLogs' })
export class NotificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    context: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    action: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    subject: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    body: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    type: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    recipient: string;

    @Column({ type: 'boolean', default: false })
    status: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    error: string;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdOn: Date;
}
