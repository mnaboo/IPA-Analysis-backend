// src/controllers/groupController.ts
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import groupModel from '../models/group';

type Id = string;

// GET /api/v1/groups
export const listGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await groupModel
      .find({}, { _id: 1, name: 1, description: 1, members: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    const shaped = groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description ?? '',
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return res.status(200).json({ status: 'success', data: { groups: shaped } });
  } catch (err) {
    console.error('Error💥 listGroups:', err);
    return res.status(500).json({ status: 'failed', message: 'listGroups error' });
  }
};

// GET /api/v1/groups/me
export const myGroups = async (req: Request, res: Response) => {
  try {
    const uid: Id = (req as any).currentUser?._id;
    const groups = await groupModel
      .find({ members: uid }, { _id: 1, name: 1, description: 1, createdAt: 1, updatedAt: 1 })
      .lean();

    return res.status(200).json({ status: 'success', data: { groups } });
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

    const result = await groupModel.updateOne(
      { _id: id },
      { $addToSet: { members: uid } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'failed', message: 'Group not found' });
    }

    // idempotentne — jeśli już był członkiem, modifiedCount będzie 0
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

    const result = await groupModel.updateOne(
      { _id: id },
      { $pull: { members: uid } }
    );

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
