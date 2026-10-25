/**
 * Journal-style editing for our existing textarea fields in Foundry VTT v13.
 *
 * Editors are created using HTMLProseMirrorElement.create, Foundry's public
 * factory. A backing textarea is retained for ApplicationV2 form submissions
 * and as a fallback if the editor cannot initialize.
 *
 * A non-toggled editor is already open; its "open" getter is the supported
 * readiness check. Never wait for implementation-specific contenteditable
 * children to determine whether the editor is ready.
 */

const EDITOR_SELECTOR = ".sc-richtext-box > prose-mirror";
const TEXTAREA_SELECTOR = ".sc-richtext-box > textarea";

function syncBox(box) {
  if (!box?.classList.contains("sc-editor-active")) return false;
  const source = box.querySelector(":scope > textarea");
  const editor = box.querySelector(":scope > prose-mirror");
  if (!source || !editor || !editor.open) return false;

  // Read current (possibly unsaved) typing. The native component's .value
  // reflects its last committed content; the live ProseMirror surface holds
  // changes until the editor saves.
  const live = editor.querySelector('.ProseMirror[contenteditable="true"]')
    ?? editor.querySelector('[contenteditable="true"]');
  const html = live?.innerHTML ?? editor.value;
  if (typeof html !== "string" || source.value === html) return false;
  source.value = html;
  return true;
}

/** Synchronize active editors before sheets read and persist their controls. */
export function syncRichTextEditors(root) {
  if (!root) return;
  for (const editor of root.querySelectorAll(EDITOR_SELECTOR)) {
    syncBox(editor.parentElement);
  }
}

/** Activate the full native Journal toolbar in text fields that are visible. */
export function mountRichTextEditors(root, owner) {
  if (!root) return;
  const EditorElement = foundry?.applications?.elements?.HTMLProseMirrorElement
    ?? globalThis.customElements?.get("prose-mirror");
  if (typeof EditorElement?.create !== "function") {
    console.warn("Leovaunt StarCraft | Foundry v13 ProseMirror element is unavailable; text fields remain editable.");
    return;
  }

  for (const source of root.querySelectorAll(TEXTAREA_SELECTOR)) {
    const box = source.parentElement;
    if (!box || box.querySelector(":scope > prose-mirror")) continue;

    let editor;
    try {
      // Creating via the native factory is important: it configures the
      // correct initial value, editor mode, and form control attributes.
      editor = EditorElement.create({
        name: source.name || "sc-text-content",
        named: false,
        value: source.value,
        editable: !source.disabled,
        toggled: false,
        compact: false,
        collaborate: false,
        documentUUID: owner?.uuid ?? ""
      });

      const activate = () => {
        if (!box.isConnected || !editor.open) return;
        box.classList.remove("sc-editor-pending");
        box.classList.add("sc-editor-active");
      };

      // Foundry emits "open" when ProseMirror finishes initializing.
      editor.addEventListener("open", activate);
      editor.addEventListener("input", event => {
        event.stopPropagation();
        syncBox(box);
      });
      editor.addEventListener("change", event => {
        event.stopPropagation();
        if (syncBox(box)) {
          // Preserve the original textarea change handling, including
          // autosaving character notes and permanent injury records.
          source.dispatchEvent(new Event("change", {bubbles:true}));
        }
      });
      editor.addEventListener("save", event => {
        event.stopPropagation();
        // After a native save, .value contains the latest serialized HTML.
        queueMicrotask(() => {
          if (syncBox(box)) {
            source.dispatchEvent(new Event("change", {bubbles:true}));
          }
        });
      });

      box.classList.add("sc-editor-pending");
      box.insertBefore(editor, source);
      // Non-toggled editors are open from initialization; checking .open
      // also handles builds that do not dispatch the "open" event here.
      queueMicrotask(activate);
    } catch (error) {
      console.warn("Leovaunt StarCraft | ProseMirror setup failed, keeping original textarea.", error);
      editor?.remove();
      box.classList.remove("sc-editor-pending", "sc-editor-active");
    }
  }
}
