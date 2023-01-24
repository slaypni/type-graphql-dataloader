import { DataSource } from "typeorm";
import { ApplicationSoftware } from "./entities/ApplicationSoftware";
import { Cert } from "./entities/Cert";
import { Chair } from "./entities/Chair";
import { Company } from "./entities/Company";
import { Desk } from "./entities/Desk";
import { Employee } from "./entities/Employee";
import { PersonalComputer } from "./entities/PersonalComputer";

export const getDataSource = (() => {
  let dataSource: DataSource | undefined;
  return async (logging: boolean = false) => {
    if (dataSource == null) {
      dataSource = new DataSource({
        type: "sqlite",
        database: ":memory:",
        entities: [
          ApplicationSoftware,
          Cert,
          Chair,
          Company,
          Desk,
          Employee,
          PersonalComputer,
        ],
        synchronize: true,
        logging,
      });
      await dataSource.initialize();
    }
    return dataSource;
  };
})();
