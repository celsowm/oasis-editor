import { OPCPackage, OPCPart } from "../OPCGraphBuilder.js";
import { StyleRegistry, NumberingRegistry, AssetRegistry, ConversionWarning } from "../../ir/DocumentIR.js";

export interface ParseContext {
  package: OPCPackage;
  currentPart: OPCPart;
  styles: StyleRegistry;
  numbering: NumberingRegistry;
  assets: AssetRegistry;
  warnings: ConversionWarning[];
}
