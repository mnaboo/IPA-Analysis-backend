// src/controllers/adminController.ts
import { Request, Response } from 'express';
import userModel, { Role } from '../models/user';
import { isValidObjectId } from 'mongoose';

// POST /api/v1/admin/users
export const listUsers = async (req: Request, res: Response) => {
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
      const isDigits = /^\d+$/.test(search);
      const asNumber = isDigits ? Number(search) : null;

      // index może być string albo number w zależności od schematu
      filter.$or = [
        // string prefix
        { index: { $regex: `^${escapeRegex(search)}` } },
        // string exact
        { index: search },
      ];

      // number exact
      if (asNumber !== null) filter.$or.push({ index: asNumber });
    }

    const projection = { _id: 1, index: 1, mail: 1, role: 1, createdAt: 1, updatedAt: 1 };

    const [data, total] = await Promise.all([
      userModel
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(rowPePage)
        .lean(),
      userModel.countDocuments(filter),
    ]);

    return res.status(200).json({ total, data });
  } catch (err) {
    console.error('Error💥 listUsers:', err);
    return res.status(500).json({ status: 'failed', message: 'Server error while listing users' });
  }
};

// GET /api/v1/admin/users/:id
export const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ status: 'failed', message: 'Invalid user id' });
  }

  const user = await userModel.findById(
    id,
    { _id: 1, index: 1, mail: 1, role: 1, createdAt: 1, updatedAt: 1 } // allow-list
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
    { new: true, runValidators: true, projection: { _id: 1, index: 1, mail: 1, role: 1 } }
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
    { projection: { _id: 1, index: 1, mail: 1, role: 1 } }
  ).lean();

  if (!deleted) return res.status(404).json({ status: 'failed', message: 'User not found' });
  return res.status(200).json({ status: 'success', data: { user: deleted } });
};

// --- helpers ---
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
