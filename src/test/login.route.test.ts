// src/test/login.route.test.ts
import request from "supertest";
import { COOKIE_NAME } from "../middleware/auth";

jest.mock("../models/user", () => {
  const userModelMock = {
    collection: {
      findOne: jest.fn(),
    },
    updateOne: jest.fn(),
  };

  return {
    __esModule: true,
    default: userModelMock,
    Role: { User: "user", Admin: "admin" },
    getUserBySessionToken: jest.fn(),
  };
});

jest.mock("../models/helpers", () => ({
  __esModule: true,
  authentication: jest.fn(),
  random: jest.fn(),
}));

// import logincontrollers etc
import app from "../app";

import userModelMock from "../models/user";
import {
  authentication as authenticationMock,
  random as randomMock,
} from "../models/helpers";

describe("POST /api/v1/login", () => {
  const url = "/api/v1/login";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("powinien zwrócić 400, gdy brak maila lub hasła", async () => {
    const res = await request(app).post(url).send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "failed",
        message: "Email and password are required.",
      })
    );
    expect((userModelMock as any).collection.findOne).not.toHaveBeenCalled();
  });

  it("powinien zwrócić 400, gdy użytkownik nie istnieje lub brak pól authentication", async () => {
    ((userModelMock as any).collection.findOne as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).post(url).send({
      mail: "test@example.com",
      password: "Test1234",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "failed",
        message: "Check your email address and password or create an account.",
      })
    );
  });

  it("powinien zwrócić 403, gdy hasło jest nieprawidłowe", async () => {
    ((userModelMock as any).collection.findOne as jest.Mock).mockResolvedValueOnce({
      _id: "user-id-1",
      index: "12345",
      mail: "test@example.com",
      role: "user",
      authentication: {
        salt: "salt123",
        password: "stored-hash",
      },
    });

    // hash z podanego hasła =/= zapisany hash
    (authenticationMock as jest.Mock).mockReturnValueOnce("wrong-hash");

    const res = await request(app).post(url).send({
      mail: "test@example.com",
      password: "BadPassword",
    });

    expect((userModelMock as any).collection.findOne).toHaveBeenCalledTimes(1);
    expect(authenticationMock as jest.Mock).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "failed",
        message: "Check your email address and password or create an account.",
      })
    );
  });

  it("powinien zalogować użytkownika, ustawić sessionToken i cookie IPA_AUTH", async () => {
    ((userModelMock as any).collection.findOne as jest.Mock).mockResolvedValueOnce({
      _id: "user-id-1",
      index: "12345",
      mail: "test@example.com",
      role: "user",
      authentication: {
        salt: "salt123",
        password: "stored-hash",
      },
    });

    // porównanie hasła
    // generowanie sessionToken
    (authenticationMock as jest.Mock)
      .mockReturnValueOnce("stored-hash")        // hasło OK
      .mockReturnValueOnce("session-token-123"); // token sesji

    (randomMock as jest.Mock).mockReturnValue("random-salt");

    ((userModelMock as any).updateOne as jest.Mock).mockResolvedValueOnce({});

    const res = await request(app).post(url).send({
      mail: "test@example.com",
      password: "CorrectPassword123",
    });

    expect((userModelMock as any).collection.findOne).toHaveBeenCalledTimes(1);
    expect((userModelMock as any).updateOne).toHaveBeenCalledWith(
      { _id: "user-id-1" },
      { $set: { "authentication.sessionToken": "session-token-123" } }
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user).toEqual(
      expect.objectContaining({
        _id: "user-id-1",
        index: "12345",
        mail: "test@example.com",
        role: "user",
      })
    );

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain(`${COOKIE_NAME}=session-token-123`);
  });
});
