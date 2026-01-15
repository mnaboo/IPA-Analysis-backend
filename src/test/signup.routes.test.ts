// src/test/signup.routes.test.ts
import request from "supertest";

//Mock modeli i zależności

jest.mock("../models/user", () => {
  const userModelMock = {
    create: jest.fn(),
  };

  return {
    __esModule: true,
    default: userModelMock,
    Role: { User: "user", Admin: "admin" },
    getUserByEmail: jest.fn(),
    getUserBySessionToken: jest.fn(),
  };
});

jest.mock("../models/userVerification", () => ({
  __esModule: true,
  userVerificationModel: {
    findOneAndUpdate: jest.fn(),
  },
  getVerificationByMail: jest.fn(),
  deleteVerificationByMail: jest.fn(),
}));

jest.mock("../models/helpers", () => ({
  __esModule: true,
  authentication: jest.fn(),
  random: jest.fn(),
}));

jest.mock("../config/mailer", () => ({
  __esModule: true,
  sendRegistrationCodeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// requireGuest jest używany w signUpRouter, pozostałe też mockujemy 
jest.mock("../middleware/auth", () => ({
  __esModule: true,
  COOKIE_NAME: "IPA_AUTH",
  HEADER_NAME: "x-session-token",
  requireGuest: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// import app, mock
import app from "../app";
import userModel, { getUserByEmail } from "../models/user";
import {
  userVerificationModel,
  getVerificationByMail,
  deleteVerificationByMail,
} from "../models/userVerification";
import {
  authentication as authenticationMock,
  random as randomMock,
} from "../models/helpers";
import { sendRegistrationCodeEmail } from "../config/mailer";

const userModelMock = userModel as any;
const getUserByEmailMock = getUserByEmail as jest.Mock;
const userVerificationModelMock = userVerificationModel as any;
const getVerificationByMailMock = getVerificationByMail as jest.Mock;
const deleteVerificationByMailMock = deleteVerificationByMail as jest.Mock;
const authenticationMockFn = authenticationMock as jest.Mock;
const randomMockFn = randomMock as jest.Mock;
const sendRegistrationCodeEmailMock = sendRegistrationCodeEmail as jest.Mock;

describe("Signup & verification routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/signup/request", () => {
    const url = "/api/v1/signup/request";

    it("powinien zwrócić 400 gdy brakuje maila / hasła / powtórzenia", async () => {
      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Email and both passwords are required",
        })
      );
      expect(getUserByEmailMock).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 403 gdy hasła się różnią", async () => {
      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
        repeatPassword: "InneHaslo",
      });

      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Passwords do not match",
        })
      );
    });

    it("powinien zwrócić 400 dla złego formatu maila", async () => {
      const res = await request(app).post(url).send({
        mail: "zly@mail.com",
        password: "Test1234",
        repeatPassword: "Test1234",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Email must be in format 123456@stud.prz.edu.pl",
        })
      );
    });

    it("powinien zwrócić 400 gdy użytkownik już istnieje", async () => {
      getUserByEmailMock.mockResolvedValueOnce({ _id: "u1" });

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
        repeatPassword: "Test1234",
      });

      expect(getUserByEmailMock).toHaveBeenCalledWith("123456@stud.prz.edu.pl");
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "User with this email already exists",
        })
      );
    });

    it("powinien utworzyć/zasaktualizować rekord weryfikacyjny i wysłać mail (200)", async () => {
      getUserByEmailMock.mockResolvedValueOnce(null);

      randomMockFn.mockReturnValue("salt-xyz");
      authenticationMockFn.mockReturnValue("hashed-pass-123");
      userVerificationModelMock.findOneAndUpdate.mockResolvedValueOnce({});
      sendRegistrationCodeEmailMock.mockResolvedValueOnce(undefined);

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
        repeatPassword: "Test1234",
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/Verification code sent/i);

      expect(userVerificationModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { mail: "123456@stud.prz.edu.pl" },
        expect.objectContaining({
          code: expect.any(String),
          password: "hashed-pass-123",
          repeatPassword: "hashed-pass-123",
          salt: "salt-xyz",
          expiresAt: expect.any(Date),
        }),
        { upsert: true }
      );

      expect(sendRegistrationCodeEmailMock).toHaveBeenCalledWith(
        "123456@stud.prz.edu.pl",
        expect.any(String)
      );
    });
  });

  describe("POST /api/v1/signup/confirm", () => {
    const url = "/api/v1/signup/confirm";

    it("powinien zwrócić 400 gdy brakuje maila lub kodu", async () => {
      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        // brak code
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Email and code are required",
        })
      );
      expect(getVerificationByMailMock).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 404 gdy brak pending registration", async () => {
      getVerificationByMailMock.mockResolvedValueOnce(null);

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
      });

      expect(getVerificationByMailMock).toHaveBeenCalledWith(
        "123456@stud.prz.edu.pl"
      );
      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "No pending registration found for this email",
        })
      );
    });

    it("powinien zwrócić 400 gdy kod jest nieprawidłowy", async () => {
      getVerificationByMailMock.mockResolvedValueOnce({
        mail: "123456@stud.prz.edu.pl",
        code: "999999",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Invalid verification code",
        })
      );
    });

    it("powinien zwrócić 400 gdy kod wygasł", async () => {
      getVerificationByMailMock.mockResolvedValueOnce({
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
        expiresAt: new Date(Date.now() - 1 * 60 * 1000), // przeszłość
      });

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Verification code has expired",
        })
      );
    });

    it("powinien utworzyć użytkownika, skasować rekord weryfikacyjny i zwrócić 201", async () => {
      const record = {
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        salt: "salt-xyz",
        password: "hashed-pass-123",
        repeatPassword: "hashed-pass-123",
      };

      getVerificationByMailMock.mockResolvedValueOnce(record);

      const createdUser = {
        toObject: () => ({
          _id: "user-id-1",
          index: "123456",
          mail: "123456@stud.prz.edu.pl",
          role: "user",
          createdAt: new Date().toISOString(),
        }),
      };

      userModelMock.create.mockResolvedValueOnce(createdUser);
      deleteVerificationByMailMock.mockResolvedValueOnce({});

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        code: "123456",
      });

      expect(userModelMock.create).toHaveBeenCalledWith({
        index: "123456",
        mail: "123456@stud.prz.edu.pl",
        role: "user",
        authentication: {
          salt: "salt-xyz",
          password: "hashed-pass-123",
          repeatPassword: "hashed-pass-123",
        },
      });

      expect(deleteVerificationByMailMock).toHaveBeenCalledWith(
        "123456@stud.prz.edu.pl"
      );

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/Account created successfully/i);
      expect(res.body.data.user).toEqual(
        expect.objectContaining({
          _id: "user-id-1",
          mail: "123456@stud.prz.edu.pl",
          role: "user",
        })
      );
    });
  });

  describe("POST /api/v1/signup (legacy register endpoint)", () => {
    const url = "/api/v1/signup";

    it("powinien zablokować próbę utworzenia konta admina (403)", async () => {
      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
        repeatPassword: "Test1234",
        role: "admin",
      });

      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Nie można utworzyć konta admin przez rejestrację.",
        })
      );
      expect(getUserByEmailMock).not.toHaveBeenCalled();
      expect(userModelMock.create).not.toHaveBeenCalled();
    });

    it("powinien poprawnie zarejestrować zwykłego użytkownika (201)", async () => {
      getUserByEmailMock.mockResolvedValueOnce(null);
      randomMockFn.mockReturnValue("salt-xyz");
      authenticationMockFn.mockReturnValue("hashed-pass-123");

      const createdUser = {
        toObject: () => ({
          _id: "user-id-2",
          index: "123456",
          mail: "123456@stud.prz.edu.pl",
          role: "user",
        }),
      };

      userModelMock.create.mockResolvedValueOnce(createdUser);

      const res = await request(app).post(url).send({
        mail: "123456@stud.prz.edu.pl",
        password: "Test1234",
        repeatPassword: "Test1234",
      });

      expect(userModelMock.create).toHaveBeenCalledWith({
        index: "123456",
        mail: "123456@stud.prz.edu.pl",
        role: "user",
        authentication: {
          salt: "salt-xyz",
          password: "hashed-pass-123",
          repeatPassword: "hashed-pass-123",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user).toEqual(
        expect.objectContaining({
          _id: "user-id-2",
          mail: "123456@stud.prz.edu.pl",
          role: "user",
        })
      );
    });
  });
});
