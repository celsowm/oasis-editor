/** Geometry evidence from the active ribbon, never from inert measurement copies. */
export async function readRibbonGeometry(page, expectedTab, expectedWidth) {
  // Acquire the stable snapshot and measure the bounds in the very same
  // browser evaluation. A separate waitForFunction followed by evaluate can
  // race a tab/fixture transition between the two protocol calls.
  return page.evaluate(async ({ expectedTab, expectedWidth }) => {
    const snapshot = () => {
      const panel = document.querySelector('[data-testid="editor-ribbon-panel"]');
      const root = document.querySelector("#ribbon-reference-root");
      if (!panel || panel.dataset.ribbonMeasured !== "true" ||
          panel.getAttribute("aria-labelledby") !== expectedTab.replace("editor-ribbon-tab-", "oasis-editor-ribbon-tab-") ||
          !root || Math.abs(root.getBoundingClientRect().width - expectedWidth) > 1) return null;
      const sections = [...panel.children].filter(el => el.hasAttribute("data-ribbon-group"));
      if (!sections.length || sections.some(el =>
        ["ribbonWidthFull", "ribbonWidthCompact", "ribbonWidthCollapsed", "ribbonWidthAllocated"]
          .some(key => !(Number(el.dataset[key]) > 0))
      )) return null;
      return { panel, signature: JSON.stringify([panel.clientWidth, panel.scrollWidth,
        ...sections.map(el => [el.dataset.ribbonGroup, el.dataset.ribbonState,
          el.dataset.ribbonWidthAllocated, el.dataset.ribbonWidthFull, el.dataset.ribbonWidthCompact,
          el.dataset.ribbonWidthCollapsed, el.getBoundingClientRect().width])]) };
    };
    let previous = null;
    let stable = 0;
    const deadline = performance.now() + 10000;
    let ready;
    do {
      await new Promise(requestAnimationFrame);
      const next = snapshot();
      stable = next && previous && next.panel === previous.panel &&
        next.signature === previous.signature ? stable + 1 : 0;
      previous = next;
      if (next && stable >= 4) { ready = next; break; }
    } while (performance.now() < deadline);
    if (!ready) throw new Error("No stable measured ribbon snapshot: " + JSON.stringify({ expectedTab, expectedWidth, last: previous?.signature }));
    const panel = ready.panel;
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    // Paint visibility is different from accessibility visibility: a preview
    // or icon intentionally marked aria-hidden must still be painted.
    const painted = (el) => !!el && !el.closest('[inert]') &&
      getComputedStyle(el).visibility === "visible" && el.getClientRects().length > 0 &&
      el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    const visible = (el) => painted(el) && !el.closest('[aria-hidden="true"]');
    const identity = (el) => el.dataset.testid || el.dataset.styleId ||
      el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim() || el.className;
    const groups = [...panel.children].filter((el) => el.hasAttribute("data-ribbon-group") && visible(el));
    const failures = [];
    const issue = (g, rule, detail) => failures.push({ group: g.dataset.ribbonGroup, rule, detail });
    const near = (a,b) => Math.abs(a-b) <= 1.01;
    const intersects = (a,b) => Math.min(a.right,b.right)-Math.max(a.x,b.x)>1.01 &&
      Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1.01;
    const groupEvidence = [];
    const allIds = new Set();
    const simplified = !!panel.closest(".oasis-editor-ribbon-simplified");
    for (const group of groups) {
      const box = rect(group);
      const state = group.dataset.ribbonState;
      const allocated = Number(group.dataset.ribbonWidthAllocated);
      if (!Number.isFinite(allocated) || Math.abs(Math.ceil(box.width)-allocated)>1)
        issue(group, "allocation", { allocated, actual: box.width, state, full: group.dataset.ribbonWidthFull, compact: group.dataset.ribbonWidthCompact, collapsed: group.dataset.ribbonWidthCollapsed });
      const caption = group.querySelector(":scope > .oasis-editor-ribbon-group-label");
      const launcher = group.querySelector(":scope > .oasis-editor-ribbon-group-launcher");
      const content = group.querySelector(":scope > .oasis-editor-ribbon-group-content > .oasis-editor-ribbon-group-rows");
      const trigger = group.querySelector(":scope > .oasis-editor-ribbon-group-collapsed-trigger");
      const expected = state === "collapsed" ? trigger : content;
      if (simplified && state !== "collapsed" && group.dataset.ribbonGroup === "paragraph" &&
          expectedTab.endsWith("-layout")) {
        for (const id of ["indent-left", "spacing-after", "indent-first-line", "indent-hanging"]) {
          if (!visible(content?.querySelector(`[data-testid="editor-toolbar-${id}"]`)))
            issue(group, "missing-inline-metric", { id });
        }
      }
      if (simplified && launcher && !visible(launcher)) issue(group,"hidden-dialog-launcher",{});
      if (!visible(expected)) issue(group, "presentation-visible", { state });
      if (state === "collapsed" && visible(content)) issue(group,"collapsed-content-visible",{});
      if (state !== "collapsed" && visible(trigger)) issue(group,"expanded-trigger-visible",{});
      const controlSelector = 'button, select, input, [role="button"], [role="option"]';
      const controls = [...group.querySelectorAll(controlSelector)].filter(visible).map((el) => {
        const r = rect(el);
        const id = el.dataset.testid;
        if (id && allIds.has(id)) issue(group,"duplicate-action-id",{ id });
        if (id) allIds.add(id);
        if (r.x < box.x-1 || r.right > box.right+1 || r.y < box.y-1 || r.bottom>box.bottom+1)
          issue(group,"control-outside-group",{ id: identity(el), rect:r, groupRect:box });
        if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") &&
            !el.getAttribute("title") && !el.textContent?.trim() && !el.labels?.length)
          issue(group,"missing-control-name",{ id:identity(el) });
        return { id: identity(el), rect:r, disabled:!!el.disabled };
      });
      let captionEvidence = null;
      if (visible(caption)) {
        const c = rect(caption);
        const style = getComputedStyle(group);
        // Caption track center excludes the reserved launcher gutter.
        const start=box.x+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft);
        const end=box.right-parseFloat(style.borderRightWidth)-parseFloat(style.paddingRight)-
          (visible(launcher)?parseFloat(getComputedStyle(caption).marginInlineEnd):0);
        if (!near((c.x+c.right)/2,(start+end)/2))
          issue(group,"caption-center",{ actual:(c.x+c.right)/2, expected:(start+end)/2 });
        if (visible(launcher) && intersects(c,rect(launcher)))
          issue(group,"caption-launcher-overlap",{ caption:c, launcher:rect(launcher) });
        for (const control of controls) {
          // The launcher owns a reserved track beside the caption, never over it.
          if (intersects(c,control.rect)) issue(group,"caption-control-overlap",{ caption:c, control });
        }
        captionEvidence={rect:c,text:caption.textContent};
      }
      const rows = [];
      if (visible(content)) {
        const items = content.querySelectorAll(":scope > .oasis-editor-ribbon-normal-rows > .oasis-editor-ribbon-row");
        for (const [index,row] of [...items].entries()) {
          const children=[...row.children].filter(visible).map(el=>({id:identity(el),rect:rect(el)}));
          if (!children.length) continue;
          let r;
          if(getComputedStyle(row).display==="contents"){
            // Reconstruct the intended grid track, not the union of child bounds.
            const parent=row.parentElement;
            const bounds=rect(parent);
            const style=getComputedStyle(parent);
            const heights=style.gridTemplateRows.split(/\s+/).map(parseFloat);
            const gap=parseFloat(style.rowGap)||0;
            const y=bounds.y+heights.slice(0,index).reduce((sum,height)=>sum+height+gap,0);
            r={x:bounds.x,y,width:bounds.width,height:heights[index],right:bounds.right,bottom:y+heights[index]};
            if(!Number.isFinite(r.height)) issue(group,"missing-logical-row-track",{index,tracks:style.gridTemplateRows});
          }else{
            if(!visible(row)) continue;
            r=rect(row);
          }
          for (const item of children) {
            if (item.rect.y < r.y-1 || item.rect.bottom>r.bottom+1)
              issue(group,"row-overflow",{ item,row:r });
          }
          for (let i=0;i<children.length;i++) for(let j=i+1;j<children.length;j++)
            if (intersects(children[i].rect,children[j].rect))
              issue(group,"row-overlap",{ a:children[i], b:children[j] });
          rows.push({rect:r,items:children});
        }
        const strip=content.querySelector(".oasis-editor-style-gallery-strip");
        if (visible(strip)) {
          const cards=[...strip.querySelectorAll(".oasis-editor-style-gallery-card")].filter(visible);
          if (!cards.length && !strip.querySelector(".oasis-editor-style-gallery-placeholder"))
            issue(group,"empty-style-strip",{rect:rect(strip)});
          for(const card of cards){
            const sample=card.querySelector(".oasis-editor-style-gallery-sample");
            if(!painted(sample))issue(group,"missing-style-preview",{id:identity(card)});
          }
        }
      }
      // Both galleries must render whole, reachable cards inside their strip.
      for (const gallery of group.querySelectorAll(".oasis-editor-style-gallery-strip, .oasis-editor-table-style-strip")) {
        if (!visible(gallery)) continue;
        const bounds = rect(gallery);
        for (const card of gallery.querySelectorAll("[data-style-id]")) {
          if (!visible(card)) continue;
          const r = rect(card);
          if (r.x < bounds.x-1 || r.right > bounds.right+1 || r.y < bounds.y-1 || r.bottom > bounds.bottom+1)
            issue(group, "gallery-card-clipped", { id: identity(card), rect: r, strip: bounds });
        }
      }
      const large=[...group.querySelectorAll(".oasis-editor-tool-button-ribbon-large, .oasis-editor-toolbar-item-ribbon-large > .oasis-editor-tool-button, .oasis-editor-toolbar-item-ribbon-large > .oasis-editor-toolbar-dropdown > .oasis-editor-tool-button")].filter(visible).map(el=>{
        const icon=el.querySelector(":scope > svg:not(.oasis-editor-dropdown-chevron)");
        const label=el.querySelector(":scope > .oasis-editor-tool-button-label");
        const chevron=el.querySelector(":scope > .oasis-editor-dropdown-chevron");
        return { id:identity(el), icon:painted(icon)?rect(icon):null,label:painted(label)?rect(label):null,chevron:painted(chevron)?rect(chevron):null };
      });
      if(!simplified && state!=="collapsed"){
        for(const key of ["icon","label","chevron"]){
          const entries=large.filter(el=>el[key]);
          if(entries.length>1 && entries.some(el=>!near(el[key].y,entries[0][key].y)))
            issue(group,"large-"+key+"-band",entries);
        }
      }
      groupEvidence.push({id:group.dataset.ribbonGroup,state,allocated,rect:box,caption:captionEvidence,rows,large,controls});
    }
    // References uses three peer large actions, not one large action and
    // a lone secondary button floating in a mostly empty row. Check across
    // group boundaries as well as within the TOC group.
    if (!simplified && expectedTab.endsWith("-references")) {
      const entries = [];
      for (const [groupId, id] of [
        ["tableOfContents", "editor-toolbar-insert-toc"],
        ["tableOfContents", "editor-toolbar-update-toc"],
        ["footnotes", "editor-toolbar-footnote"],
      ]) {
        const group = groups.find(el => el.dataset.ribbonGroup === groupId);
        if (!group || group.dataset.ribbonState === "collapsed") continue;
        const button = group.querySelector(`[data-testid="${id}"]`);
        if (!visible(button) || !button.classList.contains("oasis-editor-tool-button-ribbon-large")) {
          issue(group, "reference-action-not-large", { id });
          continue;
        }
        const icon = button.querySelector(":scope > svg:not(.oasis-editor-dropdown-chevron)");
        const label = button.querySelector(":scope > .oasis-editor-tool-button-label");
        if (!painted(icon) || !painted(label)) {
          issue(group, "reference-action-missing-caption-or-icon", { id });
          continue;
        }
        entries.push({ group, id, button: rect(button), icon: rect(icon), label: rect(label) });
      }
      for (const entry of entries.slice(1)) {
        const first = entries[0];
        for (const band of ["button", "icon", "label"]) {
          if (!near(entry[band].y, first[band].y))
            issue(entry.group, "reference-action-band", { id:entry.id, band, actual:entry[band].y, expected:first[band].y });
        }
        if (!near(entry.button.height, first.button.height))
          issue(entry.group, "reference-action-height", { id:entry.id, actual:entry.button.height, expected:first.button.height });
      }
    }
    return { simplified,panel:rect(panel),groups:groupEvidence,failures };
  }, { expectedTab, expectedWidth });
}
