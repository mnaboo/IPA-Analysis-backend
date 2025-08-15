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
          cookieAuth: { type: "apiKey", in: "cookie", name: "MACIEJ-AUTH" },
          sessionToken: { type: "apiKey", in: "header", name: "x-session-token" },
        },
        schemas: {
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
          },
          LoginRequest: {
            type: "object",
            required: ["mail", "password"],
            properties: {
              mail: { type: "string", example: "173678@stud.prz.edu.pl" },
              password: { type: "string", example: "Test1234!" },
            },
          },
        },
      },
      // globalnie akceptuj cookie lub nagłówek
      security: [{ cookieAuth: [] }, { sessionToken: [] }],
    },
    // <<< ważne: gdzie skanować komentarze JSDoc >>>
    apis: ["src/routes/**/*.ts", "src/controllers/**/*.ts", "src/models/**/*.ts"],
  };

  const spec = swaggerJsdoc(options);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get("/api-docs.json", (_req, res) => res.json(spec));
}
