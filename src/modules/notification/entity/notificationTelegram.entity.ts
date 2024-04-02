import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class NotificationTelegram {
 

  @Column()
chatId: number;
  @Column()
text: string;

}
