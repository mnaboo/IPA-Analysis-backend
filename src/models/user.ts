// src/models/user.ts
import mongoose from 'mongoose';

export enum Role {
  User = 'user',
  Admin = 'admin',
}

const userSchema = new mongoose.Schema({
  index: { type: String, required: true, unique: true },
  mail:  { type: String, required: true, unique: true },
  role:  {
    type: String,
    enum: Object.values(Role),
    default: Role.User,
    required: true,
    index: true,
  },
  authentication: {
    password: { type: String, required: true, select: false },
    repeatPassword: { type: String, required: true, select: false },
    salt: { type: String, select: false },
    sessionToken: { type: String, select: false },
    // 🔽 NOWE POLA DO RESETU HASŁA
    resetCode: { type: String, select: false },
    resetCodeExpiresAt: { type: Date, select: false },
  }
}, { timestamps: true });

const userModel = mongoose.model('User', userSchema);

export default userModel;

export const getUsers = () => userModel.find();
export const getUserByEmail = (mail: string) => userModel.findOne({ mail });
export const getUserBySessionToken = (sesionToken: string) =>
  userModel.findOne({ 'authentication.sessionToken': sesionToken });

export const getUserById = (id: string) => userModel.findById(id);
export const createUser = (values: Record<string, any>) =>
  new userModel(values).save().then((u) => u.toObject());
export const deleteUserById = (id: string) => userModel.findOneAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) =>
  userModel.findByIdAndUpdate(id, values, { new: true });
