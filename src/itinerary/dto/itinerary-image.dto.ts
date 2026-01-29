import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateItineraryImageDto {
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  imageKitFileId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class UpdateItineraryImageDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class ReorderImagesDto {
  @IsString({ each: true })
  @IsNotEmpty()
  imageIds: string[]; // Ordered array of image IDs
}
