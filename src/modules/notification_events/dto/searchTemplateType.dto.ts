import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested, } from "class-validator";

export class SearchDto {

    @ApiProperty({ example: 'EVENT', required: false })
    @IsOptional()
    @IsString()
    context?: string;

    @ApiProperty({ example: 'EVENT' })
    @IsOptional()
    @IsString()
    key: string;
}

export class SearchFilterDto {
    @ApiProperty({ type: SearchDto, description: 'Filters for search', required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => SearchDto)
    filters?: SearchDto
}