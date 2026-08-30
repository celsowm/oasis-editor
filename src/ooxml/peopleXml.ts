import { DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";

export interface PersonAuthor {
  author: string;
  userId?: string;
  providerId?: string;
}

export class PeopleXmlRegistry {
  private people: Map<string, PersonAuthor> = new Map();

  public parsePeopleXml(xml: string | null | undefined): void {
    if (!xml) return;
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const personElements = doc.getElementsByTagNameNS("*", "person");
    for (let i = 0; i < personElements.length; i++) {
      const elem = personElements.item(i) as XmlElement | null;
      if (!elem) continue;
      const author = elem.getAttribute("w15:author") || elem.getAttribute("author");
      if (author) {
        this.people.set(author, {
          author,
          userId: elem.getAttribute("w15:userId") || elem.getAttribute("userId") || undefined,
          providerId: elem.getAttribute("w15:providerId") || elem.getAttribute("providerId") || undefined,
        });
      }
    }
  }

  public registerPerson(person: PersonAuthor): void {
    this.people.set(person.author, person);
  }

  public getPerson(author: string): PersonAuthor | undefined {
    return this.people.get(author);
  }

  public serializePeopleXml(): string {
    const W15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w15:people xmlns:w15="${W15_NS}">`;
    for (const p of this.people.values()) {
      let attrs = `w15:author="${p.author}"`;
      if (p.userId) attrs += ` w15:userId="${p.userId}"`;
      if (p.providerId) attrs += ` w15:providerId="${p.providerId}"`;
      xml += `\n  <w15:person ${attrs}/>`;
    }
    xml += "\n</w15:people>";
    return xml;
  }
}
