import CompanyResolver from "./CompanyResolver";
import DeskResolver from "./DeskResolver";
import EmployeeResolver from "./EmployeeResolver";
import ChairResolver from "./ChairResolver";
import { NonEmptyArray } from "type-graphql";

export default [
  CompanyResolver,
  DeskResolver,
  EmployeeResolver,
  ChairResolver,
] as NonEmptyArray<Function>;
