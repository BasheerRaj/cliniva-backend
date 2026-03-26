import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDropdownService } from './user-dropdown.service';
import { User } from '../database/schemas/user.schema';

describe('UserDropdownService', () => {
  let service: UserDropdownService;
  let userModel: jest.Mocked<Model<User>>;
  let mockQueryChain: {
    select: jest.Mock;
    sort: jest.Mock;
    lean: jest.Mock;
    exec: jest.Mock;
  };

  const createMockModel = () => ({
    find: jest.fn(),
  });

  beforeEach(async () => {
    userModel = createMockModel() as any;
    mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };
    userModel.find.mockReturnValue(mockQueryChain as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDropdownService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UserDropdownService>(UserDropdownService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should filter by a single clinicId', async () => {
    mockQueryChain.exec.mockResolvedValue([] as any);
    const clinicId = new Types.ObjectId().toString();

    await service.getUsersForDropdown({ clinicId, role: 'doctor' });

    expect(userModel.find).toHaveBeenCalledWith({
      isActive: true,
      role: 'doctor',
      clinicId: new Types.ObjectId(clinicId),
    });
  });

  it('should filter by multiple clinicIds with $in', async () => {
    mockQueryChain.exec.mockResolvedValue([] as any);
    const clinicId1 = new Types.ObjectId().toString();
    const clinicId2 = new Types.ObjectId().toString();

    await service.getUsersForDropdown({
      role: 'doctor',
      clinicIds: [clinicId1, clinicId2],
    });

    expect(userModel.find).toHaveBeenCalledWith({
      isActive: true,
      role: 'doctor',
      clinicId: {
        $in: [new Types.ObjectId(clinicId1), new Types.ObjectId(clinicId2)],
      },
    });
  });

  it('should merge clinicId and clinicIds and ignore invalid values', async () => {
    mockQueryChain.exec.mockResolvedValue([] as any);
    const clinicId1 = new Types.ObjectId().toString();
    const clinicId2 = new Types.ObjectId().toString();

    await service.getUsersForDropdown({
      role: 'doctor',
      clinicId: clinicId1,
      clinicIds: [clinicId1, clinicId2, 'invalid-id'],
    });

    expect(userModel.find).toHaveBeenCalledWith({
      isActive: true,
      role: 'doctor',
      clinicId: {
        $in: [new Types.ObjectId(clinicId1), new Types.ObjectId(clinicId2)],
      },
    });
  });
});
