import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "TxtPromptPicker.Browse",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "TxtPromptPicker") return;
    const previous = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const value = previous?.apply(this, arguments);
      const node = this;
      const fileWidget = this.widgets?.find(w => w.name === "filename");
      if (!fileWidget) return value;
      // Keep internal file ID in the saved workflow, show the source file name separately.
      const label = this.addWidget("text", "Loaded TXT", "No file selected", () => {}, { serialize: false });
      label.serialize = false;
      const seedWidget = this.widgets?.find(w => w.name === "seed");
      const splitWidget = this.widgets?.find(w => w.name === "split_mode");
      const legacyModes = {
        "Одна строка": "One line",
        "Пустая строка": "Blank line",
        "Разделитель ---": "Separator ---",
      };
      if (splitWidget) {
        splitWidget.options.values = ["One line", "Blank line", "Separator ---"];
        if (legacyModes[splitWidget.value]) splitWidget.value = legacyModes[splitWidget.value];
        const priorConfigure = this.onConfigure;
        this.onConfigure = function (...args) {
          const result = priorConfigure?.apply(this, args);
          const widget = this.widgets?.find(w => w.name === "split_mode");
          if (widget && legacyModes[widget.value]) widget.value = legacyModes[widget.value];
          return result;
        };
      }
      const button = this.addWidget("button", "📂 Choose TXT File...", "📂 Choose TXT File...", () => {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = ".txt,text/plain";
        picker.style.display = "none";
        document.body.appendChild(picker);
        picker.addEventListener("change", async () => {
          const file = picker.files?.[0];
          picker.remove();
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            window.alert("TXT exceeds 10 MiB. Please select a smaller file.");
            return;
          }
          try {
            button.value = "Uploading...";
            node.setDirtyCanvas(true, true);
            const data = new FormData();
            data.append("file", file, file.name);
            const response = await api.fetchApi("/txt_prompt_picker/upload", { method: "POST", body: data });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Upload failed");
            fileWidget.value = result.filename;
            label.value = `${result.original} (${result.line_count ?? "?"} lines)`;
            node.setDirtyCanvas(true, true);
          } catch (error) {
            window.alert(`Could not load TXT: ${error.message}`);
          } finally {
            button.value = "📂 Choose TXT File...";
            node.setDirtyCanvas(true, true);
          }
        }, { once: true });
        picker.click();
      });
      const status = this.addWidget("text", "Queue status", "Ready", () => {}, { serialize: false });
      status.serialize = false;
      let running = false;
      let stopRequested = false;
      this.addWidget("button", "▶ Generate All Prompts", "▶ Generate All Prompts", async () => {
        if (running) return;
        if (!fileWidget.value || (fileWidget.value === "(choose TXT)" || fileWidget.value === "(выбери TXT)")) {
          window.alert("Choose a TXT file first.");
          return;
        }
        try {
          running = true;
          stopRequested = false;
          const params = new URLSearchParams({filename: fileWidget.value, split_mode: splitWidget.value});
          const infoResponse = await api.fetchApi(`/txt_prompt_picker/info?${params.toString()}`);
          const info = await infoResponse.json();
          if (!infoResponse.ok) throw new Error(info.error || "Could not read TXT file");
          const total = info.count;
          if (!total) throw new Error("No prompts in TXT");
          // This queues exactly one job per prompt, from the current seed onward.
          // Each queued workflow receives its own seed value (not the same snapshot).
          const start = Number(seedWidget.value) || 0;
          for (let i = 0; i < total; i++) {
            if (stopRequested) break;
            seedWidget.value = start + i;
            status.value = `Queuing ${i + 1}/${total}`;
            node.setDirtyCanvas(true, true);
            await app.queuePrompt(0, 1);
            if (stopRequested) {
              // A submission already in flight might land after the Stop request.
              await api.fetchApi("/queue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clear: true }),
              });
              break;
            }
          }
          if (stopRequested) {
            status.value = "Stopped. No further prompts will be queued.";
          } else {
            seedWidget.value = start + total;
            status.value = `Queued ${total} jobs. ComfyUI will process them in order.`;
          }
        } catch (err) {
          status.value = `Error: ${err.message}`;
          window.alert(`TXT Prompt Picker: ${err.message}`);
        } finally {
          running = false;
          node.setDirtyCanvas(true, true);
        }
      });
      this.addWidget("button", "⏹ Stop Entire Series", "⏹ Stop Entire Series", async () => {
        stopRequested = true;
        status.value = "Stopping entire series...";
        node.setDirtyCanvas(true, true);
        const errors = [];
        try {
          const response = await api.fetchApi("/interrupt", { method: "POST" });
          if (!response.ok) errors.push("interrupt failed");
        } catch (err) {
          errors.push(`interrupt failed: ${err.message}`);
        }
        try {
          // ComfyUI queue is global. This clears unrelated pending jobs too.
          const response = await api.fetchApi("/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clear: true })
          });
          if (!response.ok) errors.push("clear queue failed");
        } catch (err) {
          errors.push(`clear queue failed: ${err.message}`);
        }
        status.value = errors.length
          ? `Stop requested with errors: ${errors.join("; ")}`
          : "Stopped. Current generation interrupted; pending queue cleared.";
        node.setDirtyCanvas(true, true);
        if (errors.length) window.alert(`TXT Prompt Picker: ${errors.join("; ")}`);
      });
      // Put the pick button near the filename field, which is an internal upload ID.
      const arr = this.widgets;
      const pos = arr.indexOf(fileWidget);
      const bpos = arr.indexOf(button);
      if (pos >= 0 && bpos >= 0) {
        arr.splice(bpos, 1);
        arr.splice(pos, 0, button);
      }
      return value;
    };
  }
});
