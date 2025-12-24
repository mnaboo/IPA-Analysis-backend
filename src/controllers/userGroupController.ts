// src/controllers/userGroupController.ts
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import groupModel from '../models/group';

type Id = string;

/**
 * LIST GROUPS with pagination + search by name
 * Expected body:
 * {
 *   "rowPePage": 10,
 *   "Page": 2,
 *   "search": "Grupa"
 * }
 *
 * Response:
 * {
 *   "total": 17,
 *   "data": [...]
 * }
 *
 * IMPORTANT:
 * Use POST on the router for this endpoint if you want body reliably.
 */
// POST /api/v1/groups
export const listGroups = async (req: Request, res: Response) => {
  try {
    const rowPePageRaw = req.body?.rowPePage;
    const pageRaw = req.body?.Page;
    const searchRaw = req.body?.search;

    const rowPePage = Math.min(Math.max(parseInt(String(rowPePageRaw ?? '10'), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(pageRaw ?? '1'), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;

    const search = String(searchRaw ?? '').trim();

    const filter: Record<string, any> = {};
    if (search) {
      // prefix search po name (case-insensitive)
      filter.name = { $regex: `^${escapeRegex(search)}`, $options: 'i' };

      // jeśli chcesz "contains", zamień na:
      // filter.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const projection = { _id: 1, name: 1, description: 1, members: 1, createdAt: 1, updatedAt: 1 };

    const [groups, total] = await Promise.all([
      groupModel
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(rowPePage)
        .lean(),
      groupModel.countDocuments(filter),
    ]);

    const data = groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return res.status(200).json({ total, data });
  } catch (err) {
    console.error('Error💥 listGroups:', err);
    return res.status(500).json({ status: 'failed', message: 'listGroups error' });
  }
};

/**
 * MY GROUPS with pagination + search by name
 * Expected body:
 * {
 *   "rowPePage": 10,
 *   "Page": 1,
 *   "search": "Grupa"
 * }
 *
 * Response:
 * {
 *   "total": 5,
 *   "data": [...]
 * }
 *
 * IMPORTANT:
 * Use POST on the router for this endpoint if you want body reliably.
 */
// POST /api/v1/groups/me
export const myGroups = async (req: Request, res: Response) => {
  try {
    const uid: Id = (req as any).currentUser?._id;

    const rowPePageRaw = req.body?.rowPePage;
    const pageRaw = req.body?.Page;
    const searchRaw = req.body?.search;

    const rowPePage = Math.min(Math.max(parseInt(String(rowPePageRaw ?? '10'), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(pageRaw ?? '1'), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;

    const search = String(searchRaw ?? '').trim();

    const filter: Record<string, any> = { members: uid };

    if (search) {
      // prefix search po name (case-insensitive)
      filter.name = { $regex: `^${escapeRegex(search)}`, $options: 'i' };

      // jeśli chcesz "contains", zamień na:
      // filter.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const projection = { _id: 1, name: 1, description: 1, members: 1, createdAt: 1, updatedAt: 1 };

    const [groups, total] = await Promise.all([
      groupModel
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(rowPePage)
        .lean(),
      groupModel.countDocuments(filter),
    ]);

    const data = groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return res.status(200).json({ total, data });
  } catch (err) {
    console.error('Error💥 myGroups:', err);
    return res.status(500).json({ status: 'failed', message: 'myGroups error' });
  }
};

// GET /api/v1/groups/:id
export const getGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid group id' });
    }

    const g = await groupModel
      .findById(id, { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    if (!g) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    const uid: Id | undefined = (req as any).currentUser?._id;
    const isMember = uid ? g.members?.some(m => String(m) === String(uid)) : false;

    return res.status(200).json({
      status: 'success',
      data: {
        group: {
          _id: g._id,
          name: g.name,
          description: g.description ?? '',
          membersCount: Array.isArray(g.members) ? g.members.length : 0,
          isMember,
          tests: (g.tests ?? []).map((t: any) => ({
            test: t.test,
            assignedAt: t.assignedAt,
            dueAt: t.dueAt ?? null,
          })),
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Error💥 getGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'getGroup error' });
  }
};

// POST /api/v1/groups/:id/join
export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    const uid: Id = (req as any).currentUser?._id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid group id' });
    }

    const result = await groupModel.updateOne({ _id: id }, { $addToSet: { members: uid } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'failed', message: 'Group not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: result.modifiedCount ? 'Joined group' : 'Already a member',
    });
  } catch (err) {
    console.error('Error💥 joinGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'joinGroup error' });
  }
};

// POST /api/v1/groups/:id/leave
export const leaveGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    const uid: Id = (req as any).currentUser?._id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid group id' });
    }

    const result = await groupModel.updateOne({ _id: id }, { $pull: { members: uid } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'failed', message: 'Group not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: result.modifiedCount ? 'Left group' : 'You are not a member',
    });
  } catch (err) {
    console.error('Error💥 leaveGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'leaveGroup error' });
  }
};

// --- helpers ---
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
