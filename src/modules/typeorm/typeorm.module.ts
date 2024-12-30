import { Module } from '@nestjs/common';
import { TypeormService } from './typeorm.service';
import { ConfigService } from '@nestjs/config';


@Module({
    providers: [TypeormService, ConfigService],
    exports: [TypeormService, ConfigService], // Ensure that TypeormService is exported
})
export class TypeormModule {

}
