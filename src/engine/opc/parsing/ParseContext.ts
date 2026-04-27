import { OPCPackage, OPCPart } from "../OPCGraphBuilder.js";
import { StyleRegistry, NumberingRegistry, AssetRegistry, ConversionWarning } from "../../ir/DocumentIR.js";
import { IdGenerator } from "../../../core/utils/IdGenerator.js";

export interface ParseContext {
  package: OPCPackage;
  currentPart: OPCPart;
  styles: StyleRegistry;
  numbering: NumberingRegistry;
  assets: AssetRegistry;
  warnings: ConversionWarning[];
  idGenerator: IdGenerator;
}
