
import { plainToInstance } from 'class-transformer';

interface ClassConstructor {
  new (...args: any[]): object
}


export function Serialize(dto: ClassConstructor, data: any) {
  return plainToInstance(dto, data, {
    excludeExtraneousValues: true
  });
}