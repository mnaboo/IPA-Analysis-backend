// src/controllers/adminGroupsController.ts
import { Request, Response } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import groupModel from '../models/group';

type Id = string;

// POST /api/v1/admin/groups
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'failed', message: 'Name is required' });
    }

    const createdBy = (req as any).currentUser?._id ?? null;

    const doc = await groupModel.create({
      name: name.trim(),
      description: description ?? '',
      createdBy,
    });

    return res.status(201).json({
      status: 'success',
      data: {
        group: {
          _id: doc._id,
          name: doc.name,
          description: doc.description ?? '',
        },
      },
    });
  } catch (err) {
    console.error('Error💥 createGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'createGroup error' });
  }
};

// PATCH /api/v1/admin/groups/:id
export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const payload: any = {};
    if (typeof req.body.name === 'string') payload.name = req.body.name.trim();
    if (typeof req.body.description === 'string') payload.description = req.body.description;

    const updated = await groupModel
      .findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
        projection: { _id: 1, name: 1, description: 1 },
      })
      .lean();

    if (!updated) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res.status(200).json({ status: 'success', data: { group: updated } });
  } catch (err) {
    console.error('Error💥 updateGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'updateGroup error' });
  }
};

// DELETE /api/v1/admin/groups/:id
export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const deleted = await groupModel.findByIdAndDelete(id, { projection: { _id: 1 } }).lean();
    if (!deleted) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res.status(200).json({ status: 'success', message: 'Group deleted' });
  } catch (err) {
    console.error('Error💥 deleteGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'deleteGroup error' });
  }
};

// POST /api/v1/admin/groups/:id/tests   { testId, startsAt, endsAt }
export const assignTest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { testId, startsAt, endsAt } = req.body as {
      testId?: string;
      startsAt?: string;
      endsAt?: string;
    };

    // twarda walidacja -> 400, nie 500
    if (!testId || !startsAt || !endsAt) {
      return res.status(400).json({
        status: 'failed',
        message: 'testId, startsAt and endsAt are required',
      });
    }

    if (!isValidObjectId(id) || !isValidObjectId(testId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid ids' });
    }

    const s = new Date(startsAt);
    const e = new Date(endsAt);

    if (isNaN(s.getTime())) {
      return res.status(400).json({ status: 'failed', message: 'Invalid startsAt date' });
    }
    if (isNaN(e.getTime())) {
      return res.status(400).json({ status: 'failed', message: 'Invalid endsAt date' });
    }
    if (e <= s) {
      return res.status(400).json({ status: 'failed', message: 'endsAt must be later than startsAt' });
    }

    // usuń stare przypięcie tego samego testu
    await groupModel.updateOne(
      { _id: id },
      { $pull: { tests: { test: new Types.ObjectId(testId) } } }
    );

    // dodaj nowe przypięcie (assignedAt automatycznie)
    const result = await groupModel.updateOne(
      { _id: id },
      {
        $push: {
          tests: {
            test: new Types.ObjectId(testId),
            assignedAt: new Date(),
            startsAt: s,
            endsAt: e,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'failed', message: 'Group not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Test assigned' });
  } catch (err) {
    console.error('Error💥 assignTest:', err);
    return res.status(500).json({ status: 'failed', message: 'assignTest error' });
  }
};


// DELETE /api/v1/admin/groups/:id/tests/:testId
export const unassignTest = async (req: Request, res: Response) => {
  try {
    const { id, testId } = req.params as { id: Id; testId: Id };

    if (!isValidObjectId(id) || !isValidObjectId(testId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid ids' });
    }

    const result = await groupModel.updateOne(
      { _id: id },
      { $pull: { tests: { test: new Types.ObjectId(testId) } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'failed', message: 'Group not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Test unassigned' });
  } catch (err) {
    console.error('Error💥 unassignTest:', err);
    return res.status(500).json({ status: 'failed', message: 'unassignTest error' });
  }
};

// GET /api/v1/admin/groups
export const adminListGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await groupModel
      .find({}, { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    const shaped = groups.map((g: any) => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      testsCount: Array.isArray(g.tests) ? g.tests.length : 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return res.status(200).json({ status: 'success', data: { groups: shaped } });
  } catch (err) {
    console.error('Error💥 adminListGroups:', err);
    return res.status(500).json({ status: 'failed', message: 'adminListGroups error' });
  }
};

// GET /api/v1/admin/groups/:id
export const adminGetGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const g = await groupModel
      .findById(id, { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 })
      .populate({
        path: 'tests.test',
        select: '_id startsAt endsAt',
      })
      .lean();

    if (!g) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    const tests = Array.isArray((g as any).tests)
      ? (g as any).tests
          .map((t: any) => {
            const test = t.test;
            if (!test) return null;
            return {
              testId: test._id,
              assignedAt: t.assignedAt ?? null,
              startsAt: test.startsAt ?? null,
              endsAt: test.endsAt ?? null,
            };
          })
          .filter(Boolean)
      : [];

    return res.status(200).json({
      status: 'success',
      data: {
        group: {
          _id: (g as any)._id,
          name: (g as any).name,
          description: (g as any).description ?? '',
          members: (g as any).members ?? [],
          tests,
          createdAt: (g as any).createdAt,
          updatedAt: (g as any).updatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Error💥 adminGetGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'adminGetGroup error' });
  }
};
