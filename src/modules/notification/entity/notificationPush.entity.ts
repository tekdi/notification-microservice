import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class NotificationPush {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  sender_id: string;

  @Column()
  token: string;

  @Column()
  title: string;

  @Column()
  body: string;
}
