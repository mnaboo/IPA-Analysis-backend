// src/test/testResponse.aggregation.test.ts
import mongoose from "mongoose";
import testResponseModel, { getAveragedResultsForTest } from "../models/testResponse";
import "../models/template"; // rejestruje model 'Template' w mongoose

describe("getAveragedResultsForTest (IPA aggregation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("powinien zwrócić null/null gdy brak odpowiedzi", async () => {
    const findMock = jest
      .spyOn(testResponseModel as any, "find")
      .mockReturnValue({
        lean: jest.fn().mockResolvedValue([]), // brak responses
      } as any);

    const result = await getAveragedResultsForTest("test-1");

    expect(result).toEqual({
      avgImportance: null,
      avgPerformance: null,
    });

    findMock.mockRestore();
  });

  it("powinien poprawnie policzyć średnie importance i performance", async () => {
    // Mock odpowiedzi testowych
    const responses = [
      {
        closedAnswers: [
          { questionId: new mongoose.Types.ObjectId("000000000000000000000001"), value: 4 }, // importance
          { questionId: new mongoose.Types.ObjectId("000000000000000000000002"), value: 2 }, // performance
        ],
      },
      {
        closedAnswers: [
          { questionId: new mongoose.Types.ObjectId("000000000000000000000001"), value: 5 }, // importance
        ],
      },
    ];

    const findMock = jest
      .spyOn(testResponseModel as any, "find")
      .mockReturnValue({
        lean: jest.fn().mockResolvedValue(responses),
      } as any);

    // 2) Mock Template.findOne, który zwraca typ pytania (importance/performance)
    const templateModel = mongoose.model("Template");
    const findOneMock = jest
      .spyOn(templateModel as any, "findOne")
      .mockImplementation((filter: any) => {
        const qId = filter["closedQuestions._id"].toString();

        if (qId.endsWith("1")) {
          // questionId ...001 -> importance
          return Promise.resolve({
            closedQuestions: [{ type: "importance" }],
          } as any);
        }
        if (qId.endsWith("2")) {
          // questionId ...002 -> performance
          return Promise.resolve({
            closedQuestions: [{ type: "performance" }],
          } as any);
        }

        return Promise.resolve(null);
      });

    const result = await getAveragedResultsForTest("test-1");

    // importance: (4 + 5) / 2 = 4.5
    // performance: (2) / 1 = 2
    expect(result.avgImportance).toBeCloseTo(4.5);
    expect(result.avgPerformance).toBeCloseTo(2);

    findMock.mockRestore();
    findOneMock.mockRestore();
  });

  it("powinien ignorować odpowiedzi bez questionId lub value", async () => {
    const responses = [
      {
        closedAnswers: [
          { questionId: null, value: 4 },
          { questionId: new mongoose.Types.ObjectId("000000000000000000000001"), value: 3 },
          { questionId: new mongoose.Types.ObjectId("000000000000000000000002"), value: "x" },
        ],
      },
    ];

    const findMock = jest
      .spyOn(testResponseModel as any, "find")
      .mockReturnValue({
        lean: jest.fn().mockResolvedValue(responses),
      } as any);

    const templateModel = mongoose.model("Template");
    const findOneMock = jest
      .spyOn(templateModel as any, "findOne")
      .mockImplementation((filter: any) => {
        const qId = filter["closedQuestions._id"].toString();

        if (qId.endsWith("1")) {
          return Promise.resolve({
            closedQuestions: [{ type: "importance" }],
          } as any);
        }
        if (qId.endsWith("2")) {
          return Promise.resolve({
            closedQuestions: [{ type: "performance" }],
          } as any);
        }

        return Promise.resolve(null);
      });

    const result = await getAveragedResultsForTest("test-1");

    // tak naprawdę liczy się tylko jedna odpowiedź importance = 3
    expect(result.avgImportance).toBeCloseTo(3);
    // performance brak ważnych odpowiedzi -> null
    expect(result.avgPerformance).toBeNull();

    findMock.mockRestore();
    findOneMock.mockRestore();
  });
});
