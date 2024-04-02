import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class NotificationEvents {

    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    action: string;

    @Column()
    title: string;

    @Column()
    replacement: string;

    @Column()
    createdOn: Date;

    @Column()
    updatedOn: Date;

}