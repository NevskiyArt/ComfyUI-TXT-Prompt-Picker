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
      const label = this.addWidget("text", "Загружено", "Файл ещё не выбран", () => {}, { serialize: false });
      label.serialize = false;
      const seedWidget = this.widgets?.find(w => w.name === "seed");
      const splitWidget = this.widgets?.find(w => w.name === "split_mode");
      const button = this.addWidget("button", "📂 Выбрать TXT...", "📂 Выбрать TXT...", () => {
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
            window.alert("TXT больше 10 МБ. Выбери файл поменьше.");
            return;
          }
          try {
            button.value = "Загружаю...";
            node.setDirtyCanvas(true, true);
            const data = new FormData();
            data.append("file", file, file.name);
            const response = await api.fetchApi("/txt_prompt_picker/upload", { method: "POST", body: data });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Ошибка загрузки");
            fileWidget.value = result.filename;
            label.value = `${result.original} (${result.line_count ?? "?"} строк)`;
            node.setDirtyCanvas(true, true);
          } catch (error) {
            window.alert(`Не удалось открыть TXT: ${error.message}`);
          } finally {
            button.value = "📂 Выбрать TXT...";
            node.setDirtyCanvas(true, true);
          }
        }, { once: true });
        picker.click();
      });
      const status = this.addWidget("text", "Очередь", "Готово к запуску", () => {}, { serialize: false });
      status.serialize = false;
      let running = false;
      this.addWidget("button", "▶ Генерировать весь TXT", "▶ Генерировать весь TXT", async () => {
        if (running) return;
        if (!fileWidget.value || fileWidget.value === "(выбери TXT)") {
          window.alert("Сначала нажми «Выбрать TXT».");
          return;
        }
        try {
          running = true;
          const params = new URLSearchParams({filename: fileWidget.value, split_mode: splitWidget.value});
          const infoResponse = await api.fetchApi(`/txt_prompt_picker/info?${params.toString()}`);
          const info = await infoResponse.json();
          if (!infoResponse.ok) throw new Error(info.error || "Не удалось прочитать файл");
          const total = info.count;
          if (!total) throw new Error("Нет промптов в TXT");
          // This queues exactly one job per prompt, from the current seed onward.
          // Each queued workflow receives its own seed value (not the same snapshot).
          const start = Number(seedWidget.value) || 0;
          for (let i = 0; i < total; i++) {
            seedWidget.value = start + i;
            status.value = `Добавляю в очередь ${i + 1}/${total}`;
            node.setDirtyCanvas(true, true);
            await app.queuePrompt(0, 1);
          }
          seedWidget.value = start + total;
          status.value = `Добавлено ${total} заданий. ComfyUI выполнит их по очереди.`;
        } catch (err) {
          status.value = `Ошибка: ${err.message}`;
          window.alert(`TXT Prompt Picker: ${err.message}`);
        } finally {
          running = false;
          node.setDirtyCanvas(true, true);
        }
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
