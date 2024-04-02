import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class NotificationWhatsapp {
 

  @Column()
to: number;
  @Column()
message: string;

}
