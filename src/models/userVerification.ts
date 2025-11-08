// src/models/userVerification.ts
import mongoose from "mongoose";

const userVerificationSchema = new mongoose.Schema({
  mail: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  password: { type: String, required: true },
  repeatPassword: { type: String, required: true },
  salt: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const userVerificationModel = mongoose.model("UserVerification", userVerificationSchema);

export const getVerificationByMail = (mail: string) =>
  userVerificationModel.findOne({ mail });

export const deleteVerificationByMail = (mail: string) =>
  userVerificationModel.findOneAndDelete({ mail });
