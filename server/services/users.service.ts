// server/services/user.service.ts
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByMobile,
} from '../storage/users.js';
import { InsertUser } from '../../shared/schema-types.js';

export const registerUser = async (data: InsertUser) => {
  return await createUser(data);
};

export const findUserByMobile = async (mobileNumber: string) => {
  const [user] = await getUserByMobile(mobileNumber);
  return user;
};

export const findUserByEmail = async (email: string) => {
  const [user] = await getUserByEmail(email);
  return user;
};

export const findUserById = async (id: number) => {
  const [user] = await getUserById(id);
  return user;
};
