import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested, } from "class-validator";

export class SearchDto {

    @ApiProperty({ example: 'EVENT' })
    @IsString()
    @IsNotEmpty()
    context: string;
}

export class SearchFilterDto {
    @ApiProperty({ type: SearchDto, description: 'Filters for search' })
    @ValidateNested({ each: true })
    @Type(() => SearchDto)
    filters: SearchDto
}