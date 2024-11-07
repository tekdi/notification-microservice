import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested, } from "class-validator";

export class SearchDto {

    @ApiProperty({ example: 'EVENT' })
    @IsString()
    @IsNotEmpty()
    context: string;

    @ApiProperty({ example: 'EVENT' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    key: string;
}

export class SearchFilterDto {
    @ApiProperty({ type: SearchDto, description: 'Filters for search' })
    @ValidateNested({ each: true })
    @Type(() => SearchDto)
    @IsNotEmpty()
    filters: SearchDto
}