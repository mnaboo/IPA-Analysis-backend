// src/controllers/adminController.ts
import { Request, Response } from 'express';
import userModel, { Role } from '../models/user';
import { isValidObjectId } from 'mongoose';

// GET /api/v1/admin/users
export const listUsers = async (_req: Request, res: Response) => {
  const users = await userModel.find(
    {},
    { _id: 1, index: 1, mail: 1, role: 1, createdAt: 1, updatedAt: 1 } // ← tylko włączenia
  ).lean();
  return res.status(200).json({ status: 'success', data: { users } });
};

// GET /api/v1/admin/users/:id
export const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ status: 'failed', message: 'Invalid user id' });
  }
  const user = await userModel.findById(
    id,
    { _id: 1, index: 1, mail: 1, role: 1, createdAt: 1, updatedAt: 1 } // ← allow-list
  ).lean();
  if (!user) return res.status(404).json({ status: 'failed', message: 'User not found' });
  return res.status(200).json({ status: 'success', data: { user } });
};

// PATCH /api/v1/admin/users/:id/role
export const setUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body as { role: Role };

  if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid user id' });
  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ status: 'failed', message: 'Invalid role' });
  }

  // nie zdegradować ostatniego admina
  const targetIsAdmin = await userModel.exists({ _id: id, role: Role.Admin });
  if (targetIsAdmin && role === Role.User) {
    const admins = await userModel.countDocuments({ role: Role.Admin });
    if (admins <= 1) return res.status(400).json({ status: 'failed', message: 'Cannot demote the last admin' });
  }

  const updated = await userModel.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true, projection: { _id: 1, index: 1, mail: 1, role: 1 } } // ← projection zamiast .select("-authentication")
  ).lean();

  if (!updated) return res.status(404).json({ status: 'failed', message: 'User not found' });
  return res.status(200).json({ status: 'success', data: { user: updated } });
};

// DELETE /api/v1/admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ status: 'failed', message: 'Invalid user id' });

  // nie kasuj siebie i ostatniego admina
  if (req.currentUser && String(req.currentUser._id) === id) {
    return res.status(400).json({ status: 'failed', message: 'You cannot delete yourself' });
  }
  const targetIsAdmin = await userModel.exists({ _id: id, role: Role.Admin });
  if (targetIsAdmin) {
    const admins = await userModel.countDocuments({ role: Role.Admin });
    if (admins <= 1) return res.status(400).json({ status: 'failed', message: 'Cannot delete the last admin' });
  }

  const deleted = await userModel.findByIdAndDelete(
    id,
    { projection: { _id: 1, index: 1, mail: 1, role: 1 } } // ← allow-list
  ).lean();

  if (!deleted) return res.status(404).json({ status: 'failed', message: 'User not found' });
  return res.status(200).json({ status: 'success', data: { user: deleted } });
};
