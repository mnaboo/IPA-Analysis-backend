// src/test/login.passwordReset.test.ts
import request from "supertest";

// Najpierw mockujemy zależności używane w loginController:
jest.mock("../models/user", () => {
  const userModelMock = {
    findOne: jest.fn(),
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

jest.mock("../config/mailer", () => ({
  __esModule: true,
  sendPasswordResetEmail: jest.fn(),
}));

// dopiero teraz importujemy app i zamockowane moduły
import app from "../app";
import userModel from "../models/user";
import {
  authentication as authenticationMock,
  random as randomMock,
} from "../models/helpers";
import { sendPasswordResetEmail } from "../config/mailer";

const userModelMock = userModel as any;
const sendPasswordResetEmailMock = sendPasswordResetEmail as jest.Mock;
const authenticationMockFn = authenticationMock as jest.Mock;
const randomMockFn = randomMock as jest.Mock;

// helper: emulacja Mongoose-owego findOne(...).lean()
const buildLeanQuery = (result: any) => ({
  lean: jest.fn().mockResolvedValue(result),
});

describe("Password reset endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/login/password-reset/request", () => {
    const url = "/api/v1/login/password-reset/request";

    it("powinien zwrócić 400 gdy brak maila", async () => {
      const res = await request(app).post(url).send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Email is required.",
        })
      );
      expect(userModelMock.findOne).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 200 i wywołać updateOne + sendPasswordResetEmail gdy user istnieje", async () => {
      // findOne(...).lean() -> user
      (userModelMock.findOne as jest.Mock).mockReturnValueOnce(
        buildLeanQuery({
          _id: "user-id-1",
          mail: "test@example.com",
        })
      );

      userModelMock.updateOne.mockResolvedValueOnce({});
      sendPasswordResetEmailMock.mockResolvedValueOnce(undefined);

      const res = await request(app).post(url).send({
        mail: "test@example.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");

      expect(userModelMock.findOne).toHaveBeenCalledWith(
        { mail: "test@example.com" },
        { _id: 1, mail: 1 }
      );
      expect(userModelMock.updateOne).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String) // 6-cyfrowy kod
      );
    });

    it("powinien zwrócić 200 nawet jeśli user nie istnieje i nie wysyłać maila", async () => {
      // findOne(...).lean() -> null
      (userModelMock.findOne as jest.Mock).mockReturnValueOnce(
        buildLeanQuery(null)
      );

      const res = await request(app).post(url).send({
        mail: "no-user@example.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
      expect(userModelMock.updateOne).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/login/password-reset/confirm", () => {
    const url = "/api/v1/login/password-reset/confirm";

    it("powinien zwrócić 400 gdy brakuje mail/code/newPassword", async () => {
      const res = await request(app).post(url).send({
        mail: "test@example.com",
        // brak code i newPassword
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Email, code and newPassword are required.",
        })
      );
      expect(userModelMock.findOne).not.toHaveBeenCalled();
    });

    it("powinien zwrócić 400 gdy reset code jest nieprawidłowy lub wygasł", async () => {
      // tu nie ma .lean(), więc normalny Promise wystarczy
      (userModelMock.findOne as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app).post(url).send({
        mail: "test@example.com",
        code: "123456",
        newPassword: "NewStrongPassword123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "failed",
          message: "Invalid or expired reset code.",
        })
      );
    });

    it("powinien ustawić nowe hasło, wyczyścić resetCode i sessionToken oraz zwrócić 200", async () => {
      // confirmPasswordReset: userModel.findOne(...) bez .lean()
      (userModelMock.findOne as jest.Mock).mockResolvedValueOnce({
        _id: "user-id-1",
      });

      randomMockFn.mockReturnValue("salt-xyz");
      authenticationMockFn.mockReturnValue("hashed-password-123");

      userModelMock.updateOne.mockResolvedValueOnce({});

      const res = await request(app).post(url).send({
        mail: "test@example.com",
        code: "123456",
        newPassword: "NewStrongPassword123",
      });

      expect(userModelMock.findOne).toHaveBeenCalledTimes(1);
      expect(authenticationMockFn).toHaveBeenCalledWith(
        "salt-xyz",
        "NewStrongPassword123"
      );
      expect(userModelMock.updateOne).toHaveBeenCalledWith(
        { _id: "user-id-1" },
        {
          $set: {
            "authentication.password": "hashed-password-123",
            "authentication.repeatPassword": "hashed-password-123",
            "authentication.salt": "salt-xyz",
          },
          $unset: {
            "authentication.resetCode": "",
            "authentication.resetCodeExpiresAt": "",
            "authentication.sessionToken": "",
          },
        }
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: "success",
          message: "Password has been reset successfully.",
        })
      );
    });
  });
});
