// src/models/group.ts
import mongoose, { Types } from "mongoose";

const groupTestSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },

    assignedAt: { type: Date, default: Date.now },

    // OKNO CZASOWE PRZYPISANIA (per grupa)
    startsAt: { type: Date, required: true },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: any, v: Date) {
          return !this.startsAt || v > this.startsAt;
        },
        message: "endsAt must be later than startsAt",
      },
    },
  },
  { _id: true }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    tests: [groupTestSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

groupSchema.index({ "tests.test": 1 });
groupSchema.index({ "tests.startsAt": 1 });
groupSchema.index({ "tests.endsAt": 1 });
groupSchema.index({ name: 1 });

const groupModel = mongoose.model("Group", groupSchema);
export default groupModel;

// Helpers
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

function assertValidWindow(startsAt: Date, endsAt: Date) {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid startsAt");
  }
  if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid endsAt");
  }
  if (endsAt <= startsAt) {
    throw new Error("endsAt must be later than startsAt");
  }
}

export const assignTestToGroup = async (groupId: string, testId: string, startsAt: Date, endsAt: Date) => {
  assertValidWindow(startsAt, endsAt);

  const testObjId = new Types.ObjectId(testId);

  return groupModel.updateOne(
    { _id: groupId },
    [
      // usuń stare wpisy dla tego testu
      {
        $set: {
          tests: {
            $filter: {
              input: "$tests",
              as: "t",
              cond: { $ne: ["$$t.test", testObjId] },
            },
          },
        },
      },
      // dodaj nowy wpis
      {
        $set: {
          tests: {
            $concatArrays: [
              "$tests",
              [
                {
                  test: testObjId,
                  assignedAt: new Date(),
                  startsAt,
                  endsAt,
                },
              ],
            ],
          },
        },
      },
    ]
  );
};

export const unassignTestFromGroup = (groupId: string, testId: string) => {
  const testObjId = new Types.ObjectId(testId);
  return groupModel.updateOne({ _id: groupId }, { $pull: { tests: { test: testObjId } } });
};
