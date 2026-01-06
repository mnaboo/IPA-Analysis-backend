// src/controllers/userGroupController.ts
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import groupModel from '../models/group';
import userModel, { Role } from '../models/user';

type Id = string;

/**
 * LIST GROUPS with pagination + search by name
 */
// POST /api/v1/groups
export const listGroups = async (req: Request, res: Response) => {
  try {
    const uid: Id | undefined = (req as any).currentUser?._id;

    const rowPePage = Math.min(Math.max(parseInt(String(req.body?.rowPePage ?? '10'), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(req.body?.Page ?? '1'), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;
    const search = String(req.body?.search ?? '').trim();

    const filter: any = {};
    if (search) filter.name = { $regex: `^${escapeRegex(search)}`, $options: 'i' };

    const projection = { _id: 1, name: 1, description: 1, members: 1, createdAt: 1, updatedAt: 1 };

    const [groups, total] = await Promise.all([
      groupModel.find(filter, projection).sort({ createdAt: -1 }).skip(skip).limit(rowPePage).lean(),
      groupModel.countDocuments(filter),
    ]);

    const data = groups.map((g: any) => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      isMember: uid ? (g.members ?? []).some((m: any) => String(m) === String(uid)) : false,
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
 */
// POST /api/v1/groups/me
export const myGroups = async (req: Request, res: Response) => {
  try {
    const uid: Id | undefined = (req as any).currentUser?._id;
    if (!uid) return res.status(401).json({ status: 'failed', message: 'Unauthorized' });

    const rowPePage = Math.min(Math.max(parseInt(String(req.body?.rowPePage ?? '10'), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(req.body?.Page ?? '1'), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;
    const search = String(req.body?.search ?? '').trim();

    const filter: any = { members: uid };
    if (search) filter.name = { $regex: `^${escapeRegex(search)}`, $options: 'i' };

    const projection = { _id: 1, name: 1, description: 1, members: 1, createdAt: 1, updatedAt: 1 };

    const [groups, total] = await Promise.all([
      groupModel.find(filter, projection).sort({ createdAt: -1 }).skip(skip).limit(rowPePage).lean(),
      groupModel.countDocuments(filter),
    ]);

    const data = groups.map((g: any) => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      isMember: true,
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
      return res.status(400).json({ status: "failed", message: "Invalid group id" });
    }

    const g = await groupModel
      .findById(
        id,
        { _id: 1, name: 1, description: 1, members: 1, tests: 1, createdAt: 1, updatedAt: 1 }
      )
      .populate({
        path: "tests.test",
        // ✅ test info (jedno miejsce, bez duplikacji)
        select: "_id name description active startsAt endsAt createdAt template",
        populate: {
          path: "template",
          // ✅ pytania itd
          select: "_id name description closedQuestions openQuestion createdBy createdAt updatedAt",
        },
      })
      .lean();

    if (!g) return res.status(404).json({ status: "failed", message: "Group not found" });

    const currentUser = (req as any).currentUser;
    const uid: Id | undefined = currentUser?._id;
    const isMember = uid ? ((g as any).members ?? []).some((m: any) => String(m) === String(uid)) : false;
    const isAdmin = currentUser?.role === Role.Admin;

    let members: any[] = [];
    if (isAdmin) {
      members = await userModel
        .find(
          { _id: { $in: (g as any).members ?? [] } },
          { _id: 1, index: 1, mail: 1, role: 1 }
        )
        .lean();
    }

    // ✅ ZERO dublowania: tylko assignedAt + test (z template i pytaniami)
    const tests = Array.isArray((g as any).tests)
      ? (g as any).tests
          .map((t: any) => {
            const test = t.test;
            if (!test) return null;

            return {
              assignedAt: t.assignedAt ?? null,
              test: {
                _id: test._id,
                name: test.name,
                description: test.description ?? "",
                active: test.active,
                startsAt: test.startsAt ?? null,
                endsAt: test.endsAt ?? null,
                createdAt: test.createdAt ?? null,
                template: test.template ?? null, // tu jest Template z closedQuestions/openQuestion
              },
            };
          })
          .filter(Boolean)
      : [];

    return res.status(200).json({
      status: "success",
      data: {
        group: {
          _id: (g as any)._id,
          name: (g as any).name,
          description: (g as any).description ?? "",
          isMember,
          members,
          tests,
          createdAt: (g as any).createdAt,
          updatedAt: (g as any).updatedAt,
        },
      },
    });
  } catch (err) {
    console.error("Error💥 getGroup:", err);
    return res.status(500).json({ status: "failed", message: "getGroup error" });
  }
};



// POST /api/v1/groups/:id/join
export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    const uid: Id | undefined = (req as any).currentUser?._id;
    if (!uid) return res.status(401).json({ status: 'failed', message: 'Unauthorized' });

    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const result = await groupModel.updateOne({ _id: id }, { $addToSet: { members: uid } });
    if (result.matchedCount === 0) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res
      .status(200)
      .json({ status: 'success', message: result.modifiedCount ? 'Joined group' : 'Already a member' });
  } catch (err) {
    console.error('Error💥 joinGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'joinGroup error' });
  }
};

// POST /api/v1/groups/:id/leave
export const leaveGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: Id };
    const uid: Id | undefined = (req as any).currentUser?._id;
    if (!uid) return res.status(401).json({ status: 'failed', message: 'Unauthorized' });

    if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid group id' });

    const result = await groupModel.updateOne({ _id: id }, { $pull: { members: uid } });
    if (result.matchedCount === 0) return res.status(404).json({ status: 'failed', message: 'Group not found' });

    return res
      .status(200)
      .json({ status: 'success', message: result.modifiedCount ? 'Left group' : 'You are not a member' });
  } catch (err) {
    console.error('Error💥 leaveGroup:', err);
    return res.status(500).json({ status: 'failed', message: 'leaveGroup error' });
  }
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
