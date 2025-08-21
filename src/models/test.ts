// src/models/test.ts
import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
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

  createdAt: { type: Date, default: Date.now },
  active:    { type: Boolean, default: true },
});

testSchema.index({ name: 1 });
testSchema.index({ template: 1 });

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
