
import {Unit, UnitDto} from '../models/';

export class UnitMapper {
  static toDomain(dto: UnitDto): Unit {
    return {
      id: dto.id,
      name: dto.name,
      multiplierToGrams: dto.multiplier_to_grams !== null ? Number(dto.multiplier_to_grams) : 1
    };
  }

  static toDomainList(dtos: UnitDto[]): Unit[] {
    return dtos.map(dto => UnitMapper.toDomain(dto));
  }
}
