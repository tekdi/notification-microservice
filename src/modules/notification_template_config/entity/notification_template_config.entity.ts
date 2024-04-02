import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Timestamp,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationEvents } from 'src/modules/notification_events/entity/notification_events.entity';

@Entity('notification_template_config')
export class Notification_Template_Config {
  @PrimaryGeneratedColumn('increment')
  id: string;

  //@ManyToOne(() => Notification_Events, (Notification_Events) => Notification_Events.id)
  // @JoinColumn({ name: 'template_id', referencedColumnName: 'id' })
  //test: string;

  @Column()
  template_id: string;

  @Column()
  language: string;

  @Column()
  subject: string;

  @Column()
  body: string;

  // @Column()
  // params: string;

  @Column()
  createdOn: Date;

  @Column()
  updatedOn: Date;
}
