// src/test/answers.routes.test.ts
import request from "supertest";

jest.mock("../models/testResponse", () => ({
  __esModule: true,
  default: {},
  createAnswer: jest.fn(),
  getAnswersByTestId: jest.fn(),
  getAnswersByUserId: jest.fn(),
  hasUserAnsweredTest: jest.fn(),
  getAveragedResultsForTest: jest.fn(),
}));

jest.mock("../models/test", () => ({
  __esModule: true,
  default: {},
  getTestById: jest.fn(),
  getTests: jest.fn(),
  createTest: jest.fn(),
  deleteTestById: jest.fn(),
  updateTestById: jest.fn(),
}));

jest.mock("../middleware/auth", () => {
  const requireAuth = jest.fn((req: any, _res: any, next: any) => {
    // domyślnie udajemy zalogowanego użytkownika
    req.currentUser = { _id: "user-id-123", role: "user" };
    next();
  });

  const requireRole = jest.fn(() => (_req: any, _res: any, next: any) => next());
  const requireGuest = jest.fn((_req: any, _res: any, next: any) => next());

  return {
    __esModule: true,
    COOKIE_NAME: "IPA_AUTH",
    HEADER_NAME: "x-session-token",
    requireAuth,
    requireRole,
    requireGuest,
  };
});

// 3. Dopiero teraz importujemy app i funkcje z modeli
import app from "../app";
import {
  createAnswer,
  getAnswersByTestId,
  getAnswersByUserId,
  hasUserAnsweredTest,
  getAveragedResultsForTest,
} from "../models/testResponse";
import { getTestById } from "../models/test";
import { requireAuth } from "../middleware/auth";

const createAnswerMock = createAnswer as jest.Mock;
const getAnswersByTestIdMock = getAnswersByTestId as jest.Mock;
const getAnswersByUserIdMock = getAnswersByUserId as jest.Mock;
const hasUserAnsweredTestMock = hasUserAnsweredTest as jest.Mock;
const getAveragedResultsForTestMock = getAveragedResultsForTest as jest.Mock;
const getTestByIdMock = getTestById as jest.Mock;
const requireAuthMock = requireAuth as jest.Mock;

describe("Answers routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // domyślna implementacja: użytkownik zalogowany
    requireAuthMock.mockImplementation((req: any, _res: any, next: any) => {
      req.currentUser = { _id: "user-id-123", role: "user" };
      next();
    });
  });

  describe("POST /api/v1/answers/:testId", () => {
    const url = "/api/v1/answers/test-1";

    it("powinien zwrócić 401 gdy brak zalogowanego użytkownika", async () => {
      // requireAuth nie ustawia currentUser
      requireAuthMock.mockImplementation((req: any, _res: any, next: any) => {
        next();
      });

      const res = await request(app)
        .post(url)
        .send({
          closedAnswers: [{ questionId: "q1", value: 3 }],
          openAnswer: "jakieś uwagi",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "Unauthorized",
        })
      );
      expect(getTestByIdMock).not.toHaveBeenCalled();
      expect(createAnswerMock).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 400 gdy brak closedAnswers", async () => {
      const res = await request(app)
        .post(url)
        .send({
          closedAnswers: [],
          openAnswer: "coś tam",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "At least one closed answer is required.",
        })
      );
      expect(getTestByIdMock).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 404 gdy test nie istnieje", async () => {
      getTestByIdMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(url)
        .send({
          closedAnswers: [{ questionId: "q1", value: 4 }],
        });

      expect(getTestByIdMock).toHaveBeenCalledWith("test-1");
      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "Test not found",
        })
      );
    });

    it("powinien zwrócić 400 gdy użytkownik już odpowiedział na test", async () => {
      getTestByIdMock.mockResolvedValueOnce({ _id: "test-1" });
      hasUserAnsweredTestMock.mockResolvedValueOnce(true);

      const res = await request(app)
        .post(url)
        .send({
          closedAnswers: [{ questionId: "q1", value: 5 }],
        });

      expect(hasUserAnsweredTestMock).toHaveBeenCalledWith(
        "user-id-123",
        "test-1"
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "User already submitted answers for this test",
        })
      );
      expect(createAnswerMock).not.toHaveBeenCalled();
    });

    it("powinien utworzyć odpowiedzi i zwrócić 201", async () => {
      getTestByIdMock.mockResolvedValueOnce({ _id: "test-1" });
      hasUserAnsweredTestMock.mockResolvedValueOnce(false);

      const saved = {
        _id: "resp-1",
        test: "test-1",
        user: "user-id-123",
        closedAnswers: [{ questionId: "q1", value: 4 }],
        openAnswer: "Jakieś uwagi",
      };

      createAnswerMock.mockResolvedValueOnce(saved);

      const res = await request(app)
        .post(url)
        .send({
          closedAnswers: [{ questionId: "q1", value: 4 }],
          openAnswer: "  Jakieś uwagi  ",
        });

      expect(createAnswerMock).toHaveBeenCalledWith({
        test: "test-1",
        user: "user-id-123",
        closedAnswers: [{ questionId: "q1", value: 4 }],
        openAnswer: "Jakieś uwagi", // przycięte trim()
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(saved);
    });
  });

  describe("ADMIN answers routes (/api/v1/admin/answers)", () => {
    const baseAdmin = "/api/v1/admin/answers";

    it("GET /test/:testId powinien zwrócić odpowiedzi (200)", async () => {
      const data = [{ _id: "r1" }, { _id: "r2" }];
      getAnswersByTestIdMock.mockResolvedValueOnce(data);

      const res = await request(app).get(`${baseAdmin}/test/test-1`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(data);
      expect(getAnswersByTestIdMock).toHaveBeenCalledWith("test-1");
    });

    it("GET /user/:userId powinien zwrócić odpowiedzi użytkownika (200)", async () => {
      const data = [{ _id: "r1", user: "user-1" }];
      getAnswersByUserIdMock.mockResolvedValueOnce(data);

      const res = await request(app).get(`${baseAdmin}/user/user-1`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(data);
      expect(getAnswersByUserIdMock).toHaveBeenCalledWith("user-1");
    });

    it("GET /results/:testId powinien zwrócić 404 gdy brak wyników", async () => {
      getAveragedResultsForTestMock.mockResolvedValueOnce(null);

      const res = await request(app).get(`${baseAdmin}/results/test-1`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "No responses found for this test",
        })
      );
    });

    it("GET /results/:testId powinien zwrócić zagregowane wyniki (200)", async () => {
      const results = { avgImportance: 3.5, avgPerformance: 4.2 };
      getAveragedResultsForTestMock.mockResolvedValueOnce(results);

      const res = await request(app).get(`${baseAdmin}/results/test-1`);

      expect(getAveragedResultsForTestMock).toHaveBeenCalledWith("test-1");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(results);
    });

    it("GET /test/:testId powinien zwrócić 500 gdy model rzuci wyjątek", async () => {
      getAnswersByTestIdMock.mockRejectedValueOnce(new Error("DB error"));

      const res = await request(app).get(`${baseAdmin}/test/test-err`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "error",
          message: "Failed to get answers by test",
        })
      );
    });
  });
});
