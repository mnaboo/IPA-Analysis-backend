// src/controllers/adminGroupsController.ts
import { Request, Response } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import groupModel from '../models/group';

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
      data: { group: { _id: doc._id, name: doc.name, description: doc.description } },
    });
  } catch (err) {
    console.error('Error💥 createGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'createGroup error' });
  }
};

// PATCH /api/v1/admin/groups/:id
export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const payload: any = {};
    if (typeof req.body.name === 'string') payload.name = req.body.name.trim();
    if (typeof req.body.description === 'string') payload.description = req.body.description;

    const updated = await groupModel.findByIdAndUpdate(
      id,
      payload,
      { new: true, runValidators: true, projection: { _id: 1, name: 1, description: 1 } }
    ).lean();

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
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const deleted = await groupModel.findByIdAndDelete(id, { projection: { _id: 1 } }).lean();
    if (!deleted) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res.status(200).json({ status: 'success', message: 'Group deleted' });
  } catch (err) {
    console.error('Error💥 deleteGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'deleteGroup error' });
  }
};

// POST /api/v1/admin/groups/:id/tests   { testId, dueAt? }
// (bez sprawdzania istnienia testu – zapisujemy sam identyfikator)
export const assignTest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { testId, dueAt } = req.body as { testId?: string; dueAt?: string };

    if (!isValidObjectId(id) || !isValidObjectId(String(testId))) {
      return res.status(400).json({ status: 'failed', message: 'Invalid ids' });
    }

    let due: Date | null = null;
    if (dueAt) {
      const d = new Date(dueAt);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ status: 'failed', message: 'Invalid dueAt date' });
      }
      due = d;
    }

    // usuń stare przypięcie tego samego testu, potem dodaj aktualne
    await groupModel.updateOne({ _id: id }, { $pull: { tests: { test: new Types.ObjectId(testId!) } } });

    const result = await groupModel.updateOne(
      { _id: id },
      {
        $push: {
          tests: {
            test: new Types.ObjectId(testId!),
            assignedAt: new Date(),
            dueAt: due,
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
    const { id, testId } = req.params as { id: string; testId: string };

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

// (opcjonalnie) GET-y dla panelu admina

// GET /api/v1/admin/groups
export const adminListGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await groupModel.find(
      {},
      { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 }
    ).lean();

    const shaped = groups.map(g => ({
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
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const g = await groupModel.findById(
      id,
      { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 }
    ).lean();

    if (!g) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res.status(200).json({
      status: 'success',
      data: {
        group: {
          _id: g._id,
          name: g.name,
          description: g.description ?? '',
          members: g.members ?? [],
          tests: g.tests ?? [],
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Error💥 adminGetGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'adminGetGroup error' });
  }
};
