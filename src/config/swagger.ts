import { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export function setupSwagger(app: Express) {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.1.0",
      info: {
        title: "IPA Analysis API",
        version: "1.0.0",
        description: "Auto-generated OpenAPI from JSDoc comments",
      },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: {
          // cookie z sesją
          cookieAuth: { type: "apiKey", in: "cookie", name: "IPA_AUTH" },
          // fallback nagłówkowy
          sessionToken: { type: "apiKey", in: "header", name: "x-session-token" },
        },
        schemas: {
          // ---- Core types ----
          Role: { type: "string", enum: ["user", "admin"] },
          User: {
            type: "object",
            properties: {
              _id: { type: "string" },
              index: { type: "string" },
              mail: { type: "string", format: "email" },
              role: { $ref: "#/components/schemas/Role" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: ["_id", "index", "mail", "role"],
          },
          LoginRequest: {
            type: "object",
            required: ["mail", "password"],
            properties: {
              mail: { type: "string", example: "173678@stud.prz.edu.pl" },
              password: { type: "string", example: "Test1234!" },
            },
          },

          // ---- Common envelopes ----
          ApiStatus: {
            type: "string",
            enum: ["success", "failed"],
            example: "success",
          },
          ErrorResponse: {
            type: "object",
            properties: {
              status: { $ref: "#/components/schemas/ApiStatus" },
              message: { type: "string" },
            },
            required: ["status", "message"],
          },

          // ---- Responses używane w routes ----
          LoginResponse: {
            type: "object",
            properties: {
              status: { $ref: "#/components/schemas/ApiStatus" },
              data: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                },
                required: ["user"],
              },
            },
            required: ["status", "data"],
            example: {
              status: "success",
              data: { user: { _id: "id", index: "173123", mail: "173123@stud.prz.edu.pl", role: "user" } },
            },
          },
          UserResponse: {
            type: "object",
            properties: {
              status: { $ref: "#/components/schemas/ApiStatus" },
              data: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/User" },
                },
                required: ["user"],
              },
            },
            required: ["status", "data"],
          },
          UsersResponse: {
            type: "object",
            properties: {
              status: { $ref: "#/components/schemas/ApiStatus" },
              data: {
                type: "object",
                properties: {
                  users: {
                    type: "array",
                    items: { $ref: "#/components/schemas/User" },
                  },
                },
                required: ["users"],
              },
            },
            required: ["status", "data"],
          },
        },
      },
      // globalnie akceptuj cookie lub nagłówek
      security: [{ cookieAuth: [] }, { sessionToken: [] }],
    },

    // Gdzie skanować komentarze JSDoc (ścieżki i kontrolery)
    apis: ["src/routes/**/*.ts", "src/controllers/**/*.ts", "src/models/**/*.ts"],
  };

  const spec = swaggerJsdoc(options);

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      explorer: true,
      swaggerOptions: { persistAuthorization: true },
    })
  );

  app.get("/api-docs.json", (_req, res) => res.json(spec));
}
