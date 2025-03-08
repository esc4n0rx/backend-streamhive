// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
require('dotenv').config();

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
  }

  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from('streamhive_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('streamhive_users')
      .insert([{ name, email, password: hashedPassword }])
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erro ao criar usuário.', error });
    }

    const token = jwt.sign(
      { id: data.id, email: data.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', token, id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};


const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {

    const { data: user, error } = await supabase
      .from('streamhive_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'Usuário não encontrado.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Senha incorreta.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({ message: 'Login bem-sucedido!', token, id: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

module.exports = { register, login };
