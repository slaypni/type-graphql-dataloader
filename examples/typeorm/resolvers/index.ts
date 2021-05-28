import { NonEmptyArray } from "type-graphql";
import CertResolver from "./CertResolver";
import CompanyResolver from "./CompanyResolver";
import CompositeDeviceResolver from "./CompositeDeviceResolver";
import CompositeLaptopResolver from "./CompositeLaptopResolver";
import CompositeOperatingSystemResolver from "./CompositeOperatingSystemResolver";
import DeskResolver from "./DeskResolver";
import DeviceResolver from "./DeviceResolver";
import EmployeeResolver from "./EmployeeResolver";
import LaptopResolver from "./LaptopResolver";
import OperatingSystemResolver from "./OperatingSystemResolver";

export default [
  CompanyResolver,
  DeskResolver,
  EmployeeResolver,
  CertResolver,
  LaptopResolver,
  OperatingSystemResolver,
  DeviceResolver,
  CompositeLaptopResolver,
  CompositeOperatingSystemResolver,
  CompositeDeviceResolver,
] as NonEmptyArray<Function>;
