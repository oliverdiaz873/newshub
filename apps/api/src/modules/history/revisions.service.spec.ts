import { Prisma } from '@prisma/client';
import { RevisionRepository } from './revision.repository';
import { RevisionsService } from './revisions.service';

function conflict(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

const TX = {} as Prisma.TransactionClient;

describe('RevisionsService.record', () => {
  it('assigns monotonic versions per entity', async () => {
    const repo = {
      nextVersion: jest.fn().mockResolvedValue(4),
      create: jest.fn().mockImplementation(async (input: { version: number }) => ({ id: 'r1', version: input.version })),
    } as unknown as RevisionRepository;
    const service = new RevisionsService(repo);
    const out = await service.record(
      { entityType: 'article', entityId: 'a1', actorId: 'u1', cause: 'edit', snapshot: { status: 'draft' } as never },
      TX,
    );
    expect(out).toEqual({ id: 'r1', version: 4 });
    expect(repo.nextVersion).toHaveBeenCalledWith('article', 'a1', TX);
  });

  it('retries on version conflicts from concurrent writers', async () => {
    const repo = {
      nextVersion: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3),
      create: jest
        .fn()
        .mockRejectedValueOnce(conflict())
        .mockImplementation(async (input: { version: number }) => ({ id: 'r2', version: input.version })),
    } as unknown as RevisionRepository;
    const service = new RevisionsService(repo);
    const out = await service.record(
      { entityType: 'opinion', entityId: 'o1', cause: 'create', snapshot: {} as never },
      TX,
    );
    expect(out.version).toBe(3);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it('gives up after bounded attempts', async () => {
    const repo = {
      nextVersion: jest.fn().mockResolvedValue(9),
      create: jest.fn().mockRejectedValue(conflict()),
    } as unknown as RevisionRepository;
    const service = new RevisionsService(repo);
    await expect(
      service.record({ entityType: 'article', entityId: 'a9', cause: 'edit', snapshot: {} as never }, TX),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(repo.create).toHaveBeenCalledTimes(3);
  });
});
