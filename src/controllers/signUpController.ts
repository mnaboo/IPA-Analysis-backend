import userModel, { getUserByEmail } from '../models/user';
import { Request, Response } from 'express';
import { authentication, random } from '../models/helpers';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mail, password, repeatPassword } = req.body;

    // 🚫 Blokada nadawania roli przez request (szczególnie "admin")
    if (typeof req.body.role !== 'undefined') {
      if (String(req.body.role).toLowerCase() === 'admin') {
        res.status(403).json({ status: 'failed', message: 'Nie można utworzyć konta admin przez rejestrację.' });
        return;
      }
      // nawet jeśli podano inną rolę, ignorujemy ją
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

    // 6 cyfr przed @ i domena stud.prz.edu.pl
    const indexMatch = mail.match(/^(\d{6})@stud\.prz\.edu\.pl$/);
    if (!indexMatch) {
      res.status(400).send({ status: 'failed', message: 'Email must be in format 123456@stud.prz.edu.pl' });
      return;
    }
    const index = indexMatch[1];

    const existingUser = await getUserByEmail(mail);
    if (existingUser) {
      res.status(400).send({ status: 'failed', message: 'User with this email already exists' });
      return;
    }

    const salt = random();
    const userDoc = await userModel.create({
      index,
      mail,
      role: 'user', // 🔒 wymuszamy zwykłą rolę
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
