import { BranchRepository } from '../repositories/branch.repository';
import { CreateBranchDto, UpdateBranchDto } from '../dto/settings.dto';
import { AppError } from '../../../common/errors/AppError';

export class BranchService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async getAllBranches() {
    return this.branchRepository.findAll();
  }

  async getBranchById(id: string) {
    const branch = await this.branchRepository.findById(id);
    if (!branch) throw new AppError('Branch not found', 404);
    return branch;
  }

  async createBranch(dto: CreateBranchDto) {
    const existing = await this.branchRepository.findByCode(dto.code);
    if (existing) {
      throw new AppError('Branch code already exists', 400);
    }

    return this.branchRepository.create(dto as any);
  }

  async updateBranch(id: string, dto: UpdateBranchDto) {
    const branch = await this.branchRepository.findById(id);
    if (!branch) throw new AppError('Branch not found', 404);

    if (dto.code && dto.code !== branch.code) {
      const existing = await this.branchRepository.findByCode(dto.code);
      if (existing) throw new AppError('Branch code already exists', 400);
    }

    return this.branchRepository.update(id, dto as any);
  }

  async deleteBranch(id: string) {
    const branch = await this.branchRepository.findById(id);
    if (!branch) throw new AppError('Branch not found', 404);

    try {
      await this.branchRepository.delete(id);
    } catch (e) {
      throw new AppError('Cannot delete branch as it may have linked users or applications', 400);
    }
  }
}
