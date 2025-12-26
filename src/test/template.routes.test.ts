// src/test/template.routes.test.ts
import request from "supertest";
import { Types } from "mongoose";

/**
 * MOCK: template model + helpers
 * Uwaga: controller /list używa templateModel (default export) + countDocuments,
 * a reszta endpointów używa helperów (createTemplate/getTemplateById/...).
 */
jest.mock("../models/template", () => {
  const templateModelMock = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  return {
    __esModule: true,
    default: templateModelMock,
    getTemplates: jest.fn(), // jeśli już nie używasz, może zostać - nie przeszkadza
    getTemplateById: jest.fn(),
    createTemplate: jest.fn(),
    deleteTemplateById: jest.fn(),
    updateTemplateById: jest.fn(),
  };
});

/**
 * MOCK: user model (potrzebny, bo /list dociąga index twórcy po createdBy)
 */
jest.mock("../models/user", () => ({
  __esModule: true,
  Role: { Admin: "admin", User: "user" },
  default: {
    find: jest.fn(),
  },
}));

/**
 * MOCK: auth middleware
 */
jest.mock("../middleware/auth", () => ({
  __esModule: true,
  COOKIE_NAME: "IPA_AUTH",
  HEADER_NAME: "x-session-token",

  requireAuth: (req: any, _res: any, next: any) => {
    req.currentUser = { _id: "admin-id-123", role: "admin" };
    next();
  },

  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireGuest: (_req: any, _res: any, next: any) => next(),
}));

// import app + mocked exports
import app from "../app";
import templateModel, {
  getTemplateById,
  createTemplate,
  deleteTemplateById,
  updateTemplateById,
} from "../models/template";
import userModel from "../models/user";

const templateModelMock = templateModel as unknown as {
  find: jest.Mock;
  countDocuments: jest.Mock;
};

const userModelMock = userModel as unknown as {
  find: jest.Mock;
};

const getTemplateByIdMock = getTemplateById as jest.Mock;
const createTemplateMock = createTemplate as jest.Mock;
const deleteTemplateByIdMock = deleteTemplateById as jest.Mock;
const updateTemplateByIdMock = updateTemplateById as jest.Mock;

describe("Templates admin routes (/api/v1/admin/templates)", () => {
  const baseUrl = "/api/v1/admin/templates";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/admin/templates", () => {
    it("powinien zwrócić 400 gdy brak nazwy szablonu", async () => {
      const res = await request(app).post(baseUrl).send({
        description: "desc",
        closedQuestions: [],
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Name is required",
        })
      );
      expect(createTemplateMock).not.toHaveBeenCalled();
    });

    it("powinien utworzyć szablon i zwrócić 201", async () => {
      const payload = {
        name: "  My Template  ",
        description: "desc",
        closedQuestions: [
          { text: "Q1", type: "importance" },
          { text: "Q2", type: "performance" },
        ],
        openQuestion: { text: "Open Q" },
      };

      const createdTemplate = {
        _id: "tpl-1",
        name: "My Template",
        description: "desc",
        closedQuestions: payload.closedQuestions,
        openQuestion: payload.openQuestion,
        createdBy: "admin-id-123",
      };

      createTemplateMock.mockResolvedValueOnce(createdTemplate);

      const res = await request(app).post(baseUrl).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(createdTemplate);

      expect(createTemplateMock).toHaveBeenCalledWith({
        name: "My Template",
        description: "desc",
        closedQuestions: payload.closedQuestions,
        openQuestion: payload.openQuestion,
        createdBy: "admin-id-123",
      });
    });
  });

  describe("POST /api/v1/admin/templates/list", () => {
    it("powinien zwrócić listę szablonów z paginacją (200)", async () => {
      const creatorId = new Types.ObjectId().toHexString();

      const dataFromDb = [
        {
          _id: new Types.ObjectId().toHexString(),
          name: "A",
          description: "",
          createdBy: creatorId,
        },
        {
          _id: new Types.ObjectId().toHexString(),
          name: "B",
          description: "desc",
          createdBy: creatorId,
        },
      ];

      // templateModel.find(...).sort(...).skip(...).limit(...).lean()
      templateModelMock.find.mockImplementationOnce(() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => dataFromDb,
            }),
          }),
        }),
      }));

      templateModelMock.countDocuments.mockResolvedValueOnce(17);

      // userModel.find({ _id: { $in: [...] } }, ...).sort(...).lean()
      userModelMock.find.mockImplementationOnce(() => ({
        sort: () => ({
          lean: async () => [{ _id: creatorId, index: "U-001" }],
        }),
      }));

      const res = await request(app).post(`${baseUrl}/list`).send({
        rowPePage: 10,
        Page: 1,
        search: "A",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          total: 17,
          data: expect.any(Array),
        })
      );

      expect(templateModelMock.find).toHaveBeenCalledTimes(1);
      expect(templateModelMock.countDocuments).toHaveBeenCalledTimes(1);
      expect(userModelMock.find).toHaveBeenCalledTimes(1);

      // Nie wymuszam dokładnego kształtu "creatorIndex", bo zależy jak doklejasz.
      // Jeśli chcesz, możemy doprecyzować asercje 1:1 pod Twój response.
    });
  });

  describe("GET /api/v1/admin/templates/:id", () => {
    it("powinien zwrócić 200 gdy template istnieje", async () => {
      const id = new Types.ObjectId().toHexString();
      const tpl = { _id: id, name: "Template", description: "" };

      getTemplateByIdMock.mockResolvedValueOnce(tpl);

      const res = await request(app).get(`${baseUrl}/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(tpl);
      expect(getTemplateByIdMock).toHaveBeenCalledWith(id);
    });

    it("powinien zwrócić 404 gdy template nie istnieje", async () => {
      const id = new Types.ObjectId().toHexString();
      getTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app).get(`${baseUrl}/${id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "Template not found",
        })
      );
    });
  });

  describe("PUT /api/v1/admin/templates/:id", () => {
    it("powinien zaktualizować template (200)", async () => {
      const id = new Types.ObjectId().toHexString();
      const updated = {
        _id: id,
        name: "Updated",
        description: "new desc",
      };

      updateTemplateByIdMock.mockResolvedValueOnce(updated);

      const res = await request(app)
        .put(`${baseUrl}/${id}`)
        .send({ name: "Updated", description: "new desc" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(updated);

      expect(updateTemplateByIdMock).toHaveBeenCalledWith(id, {
        name: "Updated",
        description: "new desc",
      });
    });

    it("powinien zwrócić 404, gdy template nie istnieje", async () => {
      const id = new Types.ObjectId().toHexString();
      updateTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app).put(`${baseUrl}/${id}`).send({ name: "X" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "Template not found",
        })
      );
    });
  });

  describe("DELETE /api/v1/admin/templates/:id", () => {
    it("powinien zwrócić 204 gdy template został usunięty", async () => {
      const id = new Types.ObjectId().toHexString();
      deleteTemplateByIdMock.mockResolvedValueOnce({ _id: id });

      const res = await request(app).delete(`${baseUrl}/${id}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(deleteTemplateByIdMock).toHaveBeenCalledWith(id);
    });

    it("powinien zwrócić 404 gdy template nie istnieje", async () => {
      const id = new Types.ObjectId().toHexString();
      deleteTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app).delete(`${baseUrl}/${id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "fail",
          message: "Template not found",
        })
      );
    });
  });
});
