// src/models/testResponse.ts
import mongoose from 'mongoose';

const closedAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
});

const testResponseSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedAnswers: [closedAnswerSchema],
  openAnswer: { type: String, default: null },
}, { timestamps: true });

testResponseSchema.index({ test: 1, user: 1 }, { unique: true });

const testResponseModel = mongoose.model('TestResponse', testResponseSchema);
export default testResponseModel;

// Helpers
export const createAnswer = (values: Record<string, any>) =>
  new testResponseModel(values).save().then((r) => r.toObject());

export const getAnswersByTestId = (testId: string) =>
  testResponseModel.find({ test: testId }).lean();

export const getAnswersByUserId = (userId: string) =>
  testResponseModel.find({ user: userId }).lean();

export const hasUserAnsweredTest = (userId: string, testId: string) =>
  testResponseModel.exists({ user: userId, test: testId });

export const getAveragedResultsForTest = async (testId: string) => {
  const responses = await testResponseModel.find({ test: testId }).lean();

  let sumImportance = 0;
  let sumPerformance = 0;
  let countImportance = 0;
  let countPerformance = 0;

  for (const r of responses) {
    for (const ans of r.closedAnswers) {
      if (!ans.questionId || typeof ans.value !== 'number') continue;
      const q = await mongoose.model('Template').findOne({ 'closedQuestions._id': ans.questionId }, { 'closedQuestions.$': 1 });
      if (!q || !q.closedQuestions || !q.closedQuestions[0]) continue;
      const type = q.closedQuestions[0].type;
      if (type === 'importance') {
        sumImportance += ans.value;
        countImportance++;
      } else if (type === 'performance') {
        sumPerformance += ans.value;
        countPerformance++;
      }
    }
  }

  return {
    avgImportance: countImportance ? sumImportance / countImportance : null,
    avgPerformance: countPerformance ? sumPerformance / countPerformance : null,
  };
};
