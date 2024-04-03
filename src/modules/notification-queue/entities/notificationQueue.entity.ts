import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'NotificationQueue' })
export class NotificationQueue {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    channel: string;

    @Column({ type: 'varchar', nullable: true })
    context: string;

    @Column({ type: 'uuid', nullable: true })
    context_id: string;

    @Column({ type: 'varchar', nullable: true })
    subject: string;

    @Column({ type: 'varchar', nullable: true })
    body: string;

    @Column({ type: 'varchar', nullable: true })
    recipient: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdOn: string;

    @Column({ type: 'timestamp', nullable: true })
    expiry: Date;

    @Column({ type: 'int', nullable: true })
    retries: number;

    @UpdateDateColumn({ type: 'timestamp' })
    last_attempted: Date;

    @Column({ type: 'boolean', nullable: true })
    status: boolean;

}