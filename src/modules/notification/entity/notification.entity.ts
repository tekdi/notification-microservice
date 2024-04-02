import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Notification {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    channel: string;

    @Column()
    language: string;

    @Column()
    action: string;

    @Column()
    receipients: string;

    @Column()
    replacements: string;

    @Column()
    createdOn : Date;  

    @Column({ nullable: true })
    sentStatus : String;   

}