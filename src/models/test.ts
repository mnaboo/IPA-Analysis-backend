// src/models/test.ts
import mongoose from 'mongoose';

const testSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: any, v: Date) {
          return !this.startsAt || v > this.startsAt;
        },
        message: 'endsAt must be later than startsAt',
      },
    },

    createdAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: false, // masz własne createdAt
  }
);

// Indeksy
testSchema.index({ name: 1 });
testSchema.index({ template: 1 });
testSchema.index({ startsAt: 1 });
testSchema.index({ endsAt: 1 });
testSchema.index({ active: 1 });

// Model
const testModel = mongoose.model('Test', testSchema);

export default testModel;

// Helpers
export const getTests = () => testModel.find();
export const getTestById = (id: string) => testModel.findById(id);
export const createTest = (values: Record<string, any>) =>
  new testModel(values).save().then((t) => t.toObject());
export const deleteTestById = (id: string) => testModel.findOneAndDelete({ _id: id });
export const updateTestById = (id: string, values: Record<string, any>) =>
  testModel.findByIdAndUpdate(id, values, { new: true });
