
import { Module } from '@nestjs/common';
import { createLogger, transports, format } from "winston";
import { createWriteStream } from "fs";

@Module({

    
})
export class LoggerModule 
{ 
     logger = createLogger({
        transports: [
            new transports.Stream({
                stream: createWriteStream("combined.log"),
            }),
        ],
        format: format.combine(
            format.timestamp(),
            format.printf(({ timestamp, level, message, service }) => {
                return `[${timestamp}] ${service} ${level}: ${message}`;
            })
        ),
        defaultMeta: {
            service: "WinstonExample",
        },
    });
}


