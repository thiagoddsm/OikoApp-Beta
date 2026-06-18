import { CellsRepository } from '@/repositories/firestore/CellsRepository';
import { MembersRepository } from '@/repositories/firestore/MembersRepository';

export class CellService {
  constructor(
    private cellsRepo: CellsRepository,
    private membersRepo: MembersRepository
  ) {}

  /**
   * Vincula um membro a uma célula.
   * Na nossa nova modelagem, isso significa apenas atualizar a propriedade
   * hierarchy.celulaId do membro.
   */
  async addMemberToCell(memberId: string, cellId: string): Promise<void> {
    await this.membersRepo.updateMemberCell(memberId, cellId);
  }

  /**
   * Remove o vínculo de um membro com sua célula.
   */
  async removeMemberFromCell(memberId: string, leaderId: string): Promise<void> {
    if (memberId === leaderId) {
      throw new Error('Não é possível remover o líder da célula.');
    }
    await this.membersRepo.updateMemberCell(memberId, null);
  }

  /**
   * Cria uma nova célula.
   */
  async createCell(cellData: any): Promise<string> {
    return await this.cellsRepo.create(cellData);
  }

  /**
   * Atualiza os dados de uma célula existente.
   */
  async updateCell(cellId: string, cellData: any): Promise<void> {
    await this.cellsRepo.update(cellId, cellData);
  }
}
