// src/test/auth.middleware.test.ts
import { Request, Response, NextFunction } from "express";

// Najpierw mock modułu user
jest.mock("../models/user", () => ({
  __esModule: true,
  default: {},
  Role: { User: "user", Admin: "admin" },
  getUserBySessionToken: jest.fn(),
}));

import { getUserBySessionToken } from "../models/user";
import { COOKIE_NAME, requireAuth, requireGuest, requireRole } from "../middleware/auth";

const getUserBySessionTokenMock = getUserBySessionToken as jest.Mock;

const createMockRes = () => {
  const res = {} as Response;
  (res.status as any) = jest.fn().mockReturnValue(res);
  (res.json as any) = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => jest.fn() as NextFunction;

// helper do budowania łańcucha select().lean()
const buildQueryMock = (result: any) => ({
  select: () => ({
    lean: async () => result,
  }),
});

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("powinien zwrócić 401 gdy brak tokenu / usera", async () => {
      const req = {
        cookies: {},
        headers: {},
        get: (_: string) => undefined,
      } as unknown as Request;

      const res = createMockRes();
      const next = createMockNext();

      // brak tokenu => getUserBySessionToken NIE powinno być wywołane
      await requireAuth(req, res, next);

      expect(getUserBySessionTokenMock).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", message: "Not authenticated" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("powinien przepuścić dalej i ustawić req.currentUser gdy user istnieje", async () => {
      const token = "session-123";

      const req = {
        cookies: { [COOKIE_NAME]: token },
        headers: {},
        get: (_: string) => undefined,
      } as unknown as Request & { currentUser?: any };

      const res = createMockRes();
      const next = createMockNext();

      const fakeUser = { _id: "u1", mail: "test@example.com", role: "user" };

      // getUserBySessionToken(token).select().lean() -> fakeUser
      getUserBySessionTokenMock.mockReturnValueOnce(buildQueryMock(fakeUser));

      await requireAuth(req, res, next);

      expect(getUserBySessionTokenMock).toHaveBeenCalledWith(token);
      expect(req.currentUser).toEqual(fakeUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("requireGuest", () => {
    it("powinien przepuścić dalej gdy user nie jest zalogowany (brak tokenu)", async () => {
      const req = {
        cookies: {},
        headers: {},
        get: (_: string) => undefined,
      } as unknown as Request;

      const res = createMockRes();
      const next = createMockNext();

      await requireGuest(req, res, next);

      expect(getUserBySessionTokenMock).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 409 gdy user jest zalogowany", async () => {
      const req = {
        cookies: { [COOKIE_NAME]: "token-123" },
        headers: {},
        get: (_: string) => undefined,
      } as unknown as Request;

      const res = createMockRes();
      const next = createMockNext();

      const fakeUser = { _id: "u1", mail: "test@example.com", role: "user" };

      // getUserBySessionToken(...).select().lean() -> fakeUser
      getUserBySessionTokenMock.mockReturnValueOnce(buildQueryMock(fakeUser));

      await requireGuest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", message: "Already authenticated" })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("powinien zwrócić 401 gdy brak currentUser", () => {
      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      const mw = requireRole("admin" as any);
      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", message: "Not authenticated" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 403 gdy rola nie pasuje", () => {
      const req = {
        currentUser: { role: "user" },
      } as unknown as Request;

      const res = createMockRes();
      const next = createMockNext();

      const mw = requireRole("admin" as any);
      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", message: "Forbidden" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("powinien przepuścić dalej gdy rola jest dozwolona", () => {
      const req = {
        currentUser: { role: "admin" },
      } as unknown as Request;

      const res = createMockRes();
      const next = createMockNext();

      const mw = requireRole("admin" as any, "user" as any);
      mw(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
