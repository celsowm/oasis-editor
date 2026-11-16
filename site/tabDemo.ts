import {
  createEditorDocument, createEditorParagraph, createEditorParagraphFromRuns,
  createEditorTable, createEditorTableCell, createEditorTableRow,
} from "../src/core/editorState.js";
import type { EditorDocument, EditorParagraphStyle } from "../src/core/model.js";

export function createTabDemo(language: "pt" | "en"): EditorDocument {
  const pt = language === "pt";
  const p = (text: string, style?: EditorParagraphStyle) => {
    const para = createEditorParagraph(text);
    if (style) para.style = style;
    return para;
  };
  const heading = (text: string) => {
    const para = createEditorParagraphFromRuns([{text,styles:{bold:true,fontSize:18}}]);
    para.style = {spacingBefore:14,spacingAfter:8,keepWithNext:true};
    return para;
  };
  const toc = (label: string, page: number) =>
    p(label + "\t" + page, {tabs:[{position:360,type:"right",leader:"dot"}],spacingAfter:4});
  const money = (label: string, amount: string) => {
    const para = createEditorParagraphFromRuns([
      {text:label+"\t"}, {text:amount,styles:{language:{value:pt?"pt-BR":"en-US"}}},
    ]);
    para.style = {tabs:[{position:280,type:"decimal"},{position:350,type:"bar"}],spacingAfter:4};
    return para;
  };
  const row = (values: string[], header = false) =>
    createEditorTableRow(values.map(value => createEditorTableCell([p(value)])), {isHeader:header});
  const doc = createEditorDocument([
    toc(pt?"Introdução":"Introduction",1),
    toc(pt?"Fundamentação":"Background",3),
    toc(pt?"Conclusão":"Conclusion",12),
    heading(pt?"Valores alinhados pela casa decimal":"Decimal-aligned amounts"),
    money(pt?"Honorários":"Fees",pt?"1.234,56":"1,234.56"),
    money(pt?"Despesas":"Expenses",pt?"98,00":"98.00"),
    money(pt?"Total":"Total",pt?"1.332,56":"1,332.56"),
    heading(pt?"Recuos e listas":"Indents and lists"),
    p(pt?"Coloque o cursor no início deste parágrafo e pressione Tab. Use Shift+Tab para recuar.":"Place the caret at the beginning of this paragraph and press Tab. Use Shift+Tab to decrease the indent."),
    p(pt?"I.\tExemplo de peça jurídica":"I.\tLegal drafting example",{indentLeft:32,indentHanging:32,tabs:[{position:48,type:"left"}]}),
    heading(pt?"Navegação em tabelas":"Table navigation"),
    p(pt?"Clique na primeira célula. Tab avança, Shift+Tab retorna; Tab na última célula cria uma linha.":"Click the first cell. Tab advances, Shift+Tab goes back; Tab in the final cell creates a row."),
    createEditorTable([
      row(pt?["Item","Descrição","Valor"]:["Item","Description","Amount"],true),
      row(pt?["1","Exemplo","100,00"]:["1","Example","100.00"]),
    ],[100,240,120]),
    heading(pt?"Experimente a régua":"Try the ruler"),
    p(pt?"Selecione um parágrafo acima. Clique na faixa inferior da régua para criar um marcador; arraste-o, dê dois cliques ou arraste para fora. Exporte pelo menu Arquivo.":"Select a paragraph above. Click the ruler's lower lane to add a marker; drag it, double-click it, or drag it out. Export from the File menu."),
  ]);
  doc.settings = {...doc.settings,defaultTabStop:36};
  return doc;
}
