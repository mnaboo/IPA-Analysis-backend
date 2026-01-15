// src/models/test.ts
import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

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

    createdAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: false }
);

testSchema.index({ name: 1 });
testSchema.index({ template: 1 });
testSchema.index({ startsAt: 1 });
testSchema.index({ endsAt: 1 });
testSchema.index({ active: 1 });

const testModel = mongoose.model("Test", testSchema);
export default testModel;

// Helpers (stare zostają)
export const getTests = () => testModel.find();
export const getTestById = (id: string) => testModel.findById(id);

export const createTest = (values: Record<string, any>) =>
  new testModel(values).save().then((t) => t.toObject());

export const deleteTestById = (id: string) =>
  testModel.findOneAndDelete({ _id: id });

export const updateTestById = (id: string, values: Record<string, any>) =>
  testModel.findByIdAndUpdate(id, values, { new: true });

//test z pełnym szablonem (pytania + openQuestion)
export const getTestByIdWithTemplate = (id: string) =>
  testModel
    .findById(id)
    .populate({
      path: "template",
      select: "_id name description closedQuestions openQuestion createdBy createdAt updatedAt",
    })
    .lean();

//lista testów z pełnym szablonem (np. do list / group)
export const getTestsWithTemplate = (filter: any = {}, projection: any = null) =>
  testModel
    .find(filter, projection ?? undefined)
    .populate({
      path: "template",
      select: "_id name description closedQuestions openQuestion createdBy createdAt updatedAt",
    })
    .lean();
