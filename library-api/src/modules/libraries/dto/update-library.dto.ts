import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryDto } from './create-library.dto';

/**
 * PATCH body: everything from CreateLibraryDto becomes optional, so clients
 * can send only the fields they want to change (partial update).
 * PartialType also keeps all validation decorators + Swagger metadata.
 */
export class UpdateLibraryDto extends PartialType(CreateLibraryDto) {}
