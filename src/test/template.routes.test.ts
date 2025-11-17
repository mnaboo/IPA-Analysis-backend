// src/test/template.routes.test.ts
import request from "supertest";

jest.mock("../models/template", () => ({
  __esModule: true,
  default: {},
  getTemplates: jest.fn(),
  getTemplateById: jest.fn(),
  createTemplate: jest.fn(),
  deleteTemplateById: jest.fn(),
  updateTemplateById: jest.fn(),
}));

jest.mock("../middleware/auth", () => ({
  __esModule: true,
  COOKIE_NAME: "IPA_AUTH",
  HEADER_NAME: "x-session-token",

  // zawsze przepuszczamy i wstrzykujemy admina
  requireAuth: (req: any, _res: any, next: any) => {
    req.currentUser = { _id: "admin-id-123", role: "admin" };
    next();
  },

  // rola też zawsze ok
  requireRole: () => (_req: any, _res: any, next: any) => next(),

  // loginRouter używa requireGuest – tutaj też tylko przepuszczamy
  requireGuest: (_req: any, _res: any, next: any) => next(),
}));


// import app, mock
import app from "../app";
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplateById,
  updateTemplateById,
} from "../models/template";

const getTemplatesMock = getTemplates as jest.Mock;
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

  describe("GET /api/v1/admin/templates", () => {
    it("powinien zwrócić listę szablonów (200)", async () => {
      const templates = [
        { _id: "tpl-1", name: "A", description: "" },
        { _id: "tpl-2", name: "B", description: "desc" },
      ];

      getTemplatesMock.mockResolvedValueOnce(templates);

      const res = await request(app).get(baseUrl);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(templates);
      expect(getTemplatesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/v1/admin/templates/:id", () => {
    it("powinien zwrócić 200 gdy template istnieje", async () => {
      const tpl = { _id: "tpl-1", name: "Template", description: "" };

      getTemplateByIdMock.mockResolvedValueOnce(tpl);

      const res = await request(app).get(`${baseUrl}/tpl-1`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(tpl);
      expect(getTemplateByIdMock).toHaveBeenCalledWith("tpl-1");
    });

    it("powinien zwrócić 404 gdy template nie istnieje", async () => {
      getTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app).get(`${baseUrl}/unknown-id`);

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
      const updated = {
        _id: "tpl-1",
        name: "Updated",
        description: "new desc",
      };

      updateTemplateByIdMock.mockResolvedValueOnce(updated);

      const res = await request(app)
        .put(`${baseUrl}/tpl-1`)
        .send({ name: "Updated", description: "new desc" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toEqual(updated);
      expect(updateTemplateByIdMock).toHaveBeenCalledWith("tpl-1", {
        name: "Updated",
        description: "new desc",
      });
    });

    it("powinien zwrócić 404, gdy template nie istnieje", async () => {
      updateTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`${baseUrl}/missing`)
        .send({ name: "X" });

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
      deleteTemplateByIdMock.mockResolvedValueOnce({ _id: "tpl-1" });

      const res = await request(app).delete(`${baseUrl}/tpl-1`);

      expect(res.status).toBe(204);
      expect(res.text).toBe(""); // brak body
      expect(deleteTemplateByIdMock).toHaveBeenCalledWith("tpl-1");
    });

    it("powinien zwrócić 404 gdy template nie istnieje", async () => {
      deleteTemplateByIdMock.mockResolvedValueOnce(null);

      const res = await request(app).delete(`${baseUrl}/missing`);

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
