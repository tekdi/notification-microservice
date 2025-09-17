import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested, IsNumber, Min } from "class-validator";

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

    @ApiProperty({ example: 'TITLE' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title: string;
}

export class SearchFilterDto {
    @ApiProperty({ type: SearchDto, description: 'Filters for search' })
    @ValidateNested({ each: true })
    @Type(() => SearchDto)
    @IsNotEmpty()
    filters: SearchDto;

    @ApiProperty({ example: 10, description: 'Number of records to return', required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number;

    @ApiProperty({ example: 0, description: 'Number of records to skip', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number;
}