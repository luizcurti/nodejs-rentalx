import createConnection from "@shared/infra/typeorm";
import { app } from "./app";

createConnection()
  .then(() => {
    app.listen(3333, () => console.log("Server is running!"));
  })
  .catch(console.error);
