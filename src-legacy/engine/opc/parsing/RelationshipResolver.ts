import { OPCPackage, OPCPart, Relationship } from "../OPCGraphBuilder.js";

export class RelationshipResolver {
  resolveRelationship(part: OPCPart, relId: string, pkg: OPCPackage): OPCPart | null {
    const rel = part.relationships.find((r) => r.id === relId);
    if (!rel) return null;
    const target = rel.target.startsWith("/") ? rel.target.substring(1) : rel.target;
    return pkg.parts.get(target) || null;
  }

  findRelationship(part: OPCPart, relId: string): Relationship | undefined {
    return part.relationships.find((r) => r.id === relId);
  }
}
