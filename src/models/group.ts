// src/models/group.ts
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // członkowie grupy (użytkownicy)
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],

  // przypisane testy do rozwiązania przez grupę
  tests: [{
    test:       { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    assignedAt: { type: Date, default: Date.now },
    dueAt:      { type: Date, default: null },
  }],

  // kto utworzył (admin)
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

groupSchema.index({ 'tests.test': 1 });
groupSchema.index({ name: 1 }); // nie unikalny, ale przydatny do wyszukiwania

const groupModel = mongoose.model('Group', groupSchema);

export default groupModel;

// Helpers – taki sam styl jak w user.ts
export const getGroups = () => groupModel.find();
export const getGroupById = (id: string) => groupModel.findById(id);
export const createGroup = (values: Record<string, any>) =>
  new groupModel(values).save().then((g) => g.toObject());
export const deleteGroupById = (id: string) => groupModel.findOneAndDelete({ _id: id });
export const updateGroupById = (id: string, values: Record<string, any>) =>
  groupModel.findByIdAndUpdate(id, values, { new: true });

// członkostwo
export const addMemberToGroup = (groupId: string, userId: string) =>
  groupModel.updateOne({ _id: groupId }, { $addToSet: { members: userId } });
export const removeMemberFromGroup = (groupId: string, userId: string) =>
  groupModel.updateOne({ _id: groupId }, { $pull: { members: userId } });

// testy przypięte do grupy
export const assignTestToGroup = (groupId: string, testId: string, dueAt?: Date) =>
  groupModel.updateOne(
    { _id: groupId },
    {
      $pull: { tests: { test: testId } }, // usuń ewentualny duplikat
    }
  ).then(() =>
    groupModel.updateOne(
      { _id: groupId },
      {
        $push: {
          tests: {
            test: testId,
            assignedAt: new Date(),
            dueAt: dueAt ?? null,
          },
        },
      }
    )
  );

export const unassignTestFromGroup = (groupId: string, testId: string) =>
  groupModel.updateOne({ _id: groupId }, { $pull: { tests: { test: testId } } });
