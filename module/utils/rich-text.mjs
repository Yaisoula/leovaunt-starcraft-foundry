/**
 * Mount Foundry VTT v13's native Journal-style ProseMirror editor over an
 * existing textarea. Unlike swapping template controls, this progressive
 * enhancement cannot prevent a sheet opening if the editor fails to load.
 *
 * The textarea remains the canonical form control, and is only hidden after
 * Foundry emits the editor's "open" event.
 */
function syncBox(box) {
  if (!box?.classList.contains("sc-editor-active")) return false;
  const source = box.querySelector(":scope > textarea");
  const editor = box.querySelector(":scope > prose-mirror");
  if (!source || !editor) return false;
  const editable = editor.querySelector('.ProseMirror[contenteditable="true"]')
    ?? editor.querySelector('[contenteditable="true"]');
  const html = editable?.innerHTML ?? editor.value;
  if (typeof html !== "string" || html === source.value) return false;
  source.value = html;
  return true;
}

export function syncRichTextEditors(root) {
  if (!root) return;
  for (const box of root.querySelectorAll(".sc-richtext-box.sc-editor-active")) syncBox(box);
}

export function mountRichTextEditors(root, owner) {
  // Foundry must register its native element first; preserve ordinary textareas otherwise.
  if (!root || !globalThis.customElements?.get("prose-mirror")) return;
  for (const source of root.querySelectorAll(".sc-richtext-box > textarea")) {
    const box = source.parentElement;
    if (!box || box.querySelector(":scope > prose-mirror")) continue;
    let editor;
    try {
      editor = globalThis.document.createElement("prose-mirror");
      editor.setAttribute("value", source.value);
      editor.setAttribute("editable", "true");
      editor.setAttribute("toggled", "false");
      editor.setAttribute("collaborate", "false");
      if (owner?.uuid) editor.setAttribute("document-uuid", owner.uuid);

      // No name: the existing textarea continues to be the one form field.
      // This avoids duplicate submissions of system fields in ApplicationV2.
      const activate = () => {
        if (!box.isConnected || !editor.querySelector('[contenteditable="true"]')) return;
        box.classList.remove("sc-editor-pending");
        box.classList.add("sc-editor-active");
      };
      editor.addEventListener("open", activate, {once:true});
      editor.addEventListener("input", event => {
        event.stopPropagation(); // Do not rerender the sheet while typing.
        syncBox(box);
      });
      editor.addEventListener("change", event => {
        event.stopPropagation();
        const changed = syncBox(box);
        // Preserve the actor sheet's existing autosave and injury-note handlers.
        if (changed) source.dispatchEvent(new Event("change", {bubbles:true}));
      });
      editor.addEventListener("save", () => {
        queueMicrotask(() => {
          const changed = syncBox(box);
          if (changed) source.dispatchEvent(new Event("change", {bubbles:true}));
        });
      });
      box.classList.add("sc-editor-pending");
      box.insertBefore(editor, source);
      queueMicrotask(activate);
    } catch (error) {
      // Error isolation: item windows and their Edit buttons must remain usable.
      console.warn("Leovaunt StarCraft | Rich text editor unavailable; using textarea", error);
      editor?.remove();
      box?.classList.remove("sc-editor-pending", "sc-editor-active");
    }
  }
}
