import userModel, { getUserByEmail } from '../models/user';
import { Request, Response } from 'express';
import { authentication, random } from '../models/helpers';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mail, password, repeatPassword } = req.body;

    if (!mail || !password || !repeatPassword) {
      res.status(400).send({
        status: 'failed',
        message: 'Email and both passwords are required',
      });
      return;
    }

    if (password !== repeatPassword) {
      res.status(403).send({
        status: 'failed',
        message: 'Passwords do not match',
      });
      return;
    }

    // Wydobycie indeksu z adresu e-mail (6 cyfr przed @)
    const indexMatch = mail.match(/^(\d{6})@stud\.prz\.edu\.pl$/);
    if (!indexMatch) {
      res.status(400).send({
        status: 'failed',
        message: 'Email must be in format 123456@stud.prz.edu.pl',
      });
      return;
    }

    const index = indexMatch[1];

    const existingUser = await getUserByEmail(mail);
    if (existingUser) {
      res.status(400).send({
        status: 'failed',
        message: 'User with this email already exists',
      });
      return;
    }

    const salt = random();
    const user = new userModel({
      index,
      mail,
      authentication: {
        salt,
        password: authentication(salt, password),
        repeatPassword: authentication(salt, repeatPassword),
      },
    });

    await user.save();
    res.status(200).send({ status: 'success', data: user });
  } catch (err) {
    console.log('Error💥: ', err);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
};
