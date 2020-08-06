import { NonEmptyArray } from "type-graphql";
import CertResolver from "./CertResolver";
import CompanyResolver from "./CompanyResolver";
import DeskResolver from "./DeskResolver";
import EmployeeResolver from "./EmployeeResolver";

export default [
  CompanyResolver,
  DeskResolver,
  EmployeeResolver,
  CertResolver,
] as NonEmptyArray<Function>;
