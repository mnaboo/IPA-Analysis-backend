import userModel, { getUserByEmail } from '../models/user';
import { Request, Response } from 'express';
import { authentication, random } from '../models/helpers';

const STUDENT_DOMAIN = '@stud.prz.edu.pl';
const ADMIN_DOMAIN = '@prz.edu.pl';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mail, password, repeatPassword } = req.body;

    // Blokada nadawania roli przez request
    if (typeof req.body.role !== 'undefined') {
      // ignorujemy każdą próbę nadania roli z requesta (w szczególności admin)
      delete req.body.role;
    }

    if (!mail || !password || !repeatPassword) {
      res.status(400).send({ status: 'failed', message: 'Email and both passwords are required' });
      return;
    }

    if (password !== repeatPassword) {
      res.status(403).send({ status: 'failed', message: 'Passwords do not match' });
      return;
    }

    const mailNorm = String(mail).trim().toLowerCase();

    // Musi zawierać jedno "@"
    const parts = mailNorm.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      res.status(400).send({ status: 'failed', message: 'Invalid email format' });
      return;
    }

    // index zawsze = wszystko przed "@"
    const index = parts[0];

    // rola zależna od domeny
    let role: 'user' | 'admin';
    if (mailNorm.endsWith(ADMIN_DOMAIN)) {
      role = 'admin';
    } else if (mailNorm.endsWith(STUDENT_DOMAIN)) {
      role = 'user';
    } else {
      res.status(400).send({
        status: 'failed',
        message: `Email must be in domain ${STUDENT_DOMAIN} (student) or ${ADMIN_DOMAIN} (admin)`,
      });
      return;
    }

    const existingUser = await getUserByEmail(mailNorm);
    if (existingUser) {
      res.status(400).send({ status: 'failed', message: 'User with this email already exists' });
      return;
    }

    const salt = random();
    const userDoc = await userModel.create({
      index,
      mail: mailNorm,
      role, // admin albo user zależnie od domeny
      authentication: {
        salt,
        password: authentication(salt, password),
        repeatPassword: authentication(salt, repeatPassword),
      },
    });

    // Usuń wrażliwe pola z odpowiedzi
    const { authentication: _auth, ...safe } = userDoc.toObject();
    res.status(201).json({ status: 'success', data: { user: safe } });
  } catch (err) {
    console.log('Error💥: ', err);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
};
