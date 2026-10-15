require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");

const app = express();

// Middlewares de configuración y seguridad
app.use(express.json());
app.use(cors());
app.use(helmet());

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }, // Requerido por Azure Database for PostgreSQL
});

// Middleware para proteger las rutas con nuestro API_SECRET
const protegerRuta = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.API_SECRET) {
    return res
      .status(401)
      .json({ error: "Acceso no autorizado: API Key inválida o ausente" });
  }
  next();
};

// Ruta GET: Obtener todos los usuarios
app.get("/api/users", protegerRuta, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(rows);
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta POST: Crear un nuevo usuario (con validaciones)
app.post(
  "/api/users",
  protegerRuta,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("El nombre debe tener entre 2 y 100 caracteres"),
    body("email")
      .isEmail()
      .withMessage("Debe ser un correo electrónico válido")
      .normalizeEmail(),
  ],
  async (req, res) => {
    // Verificar si hay errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
        [name, email],
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      // Código 23505 en Postgres significa violación de restricción UNIQUE (email duplicado)
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ error: "El correo electrónico ya está registrado" });
      }
      console.error("Error en POST /api/users:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);
// Ruta PUT: Actualizar un usuario existente
app.put(
  "/api/users/:id",
  protegerRuta,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Nombre inválido"),
    body("email").isEmail().withMessage("Email inválido").normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, email } = req.body;

    try {
      const result = await pool.query(
        "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
        [name, email, id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res.status(400).json({ error: "El email ya está en uso" });
      res.status(500).json({ error: "Error interno" });
    }
  },
);

// Ruta DELETE: Eliminar un usuario
app.delete("/api/users/:id", protegerRuta, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({
      message: "Usuario eliminado exitosamente",
      deletedUser: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno" });
  }
});

// Iniciar el servidor
// Azure inyecta su propio process.env.PORT, por eso usamos esta estructura
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend funcionando correctamente en el puerto ${PORT}`);
});
