import mongoose from 'mongoose';

const closedQuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['importance', 'performance'], required: true }, // rozróżnienie pary
});

const templateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  closedQuestions: [closedQuestionSchema],

  openQuestion: {
    text: { type: String, default: null }, // może nie istnieć
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // tylko admin
}, { timestamps: true });

templateSchema.index({ name: 1 });

const templateModel = mongoose.model('Template', templateSchema);

export default templateModel;

// Helpers
export const getTemplates = () => templateModel.find();
export const getTemplateById = (id: string) => templateModel.findById(id);
export const createTemplate = (values: Record<string, any>) =>
  new templateModel(values).save().then((t) => t.toObject());
export const deleteTemplateById = (id: string) => templateModel.findOneAndDelete({ _id: id });
export const updateTemplateById = (id: string, values: Record<string, any>) =>
  templateModel.findByIdAndUpdate(id, values, { new: true });
