# TXT Prompt Picker for ComfyUI

[Читать инструкцию на русском](README_RU.md)

A small custom node for **batch image generation from a TXT prompt list** in ComfyUI. Upload a local `.txt` file using the **Choose TXT** button, then press **Generate full TXT** to queue one job per prompt. No manual file paths are required.

## Features

- Native browser file picker that can select a TXT from any folder on your computer.
- Batch-queue all prompts with a single button.
- Sequential order, starting from the node's current `seed` index.
- Three splitting modes: one nonempty line per prompt, blank lines between prompts, or a line containing `---` between prompts.
- UTF-8 / UTF-8 BOM and CP1251 text; UTF-16 with BOM.
- Maximum file size: 10 MiB.
- Compatible with prompt inputs accepting `STRING`, including workflows for FLUX, Qwen and Z-Image.
- No third-party Python dependencies beyond those already provided by ComfyUI.

## Install manually

1. Download the repository ZIP from **Code > Download ZIP** (or clone the repository).
2. Place the extracted extension folder into your `ComfyUI/custom_nodes/` directory. Ensure `__init__.py`, `nodes.py`, `routes.py`, and `web/` are directly inside the extension directory.
3. Restart ComfyUI and refresh the browser if necessary.
4. Search for the node **TXT → Промпты по очереди** under `TXT Prompts`.

Once released to [Comfy Registry](https://registry.comfy.org/), it can also be installed through ComfyUI Manager.

## Usage

1. Place the node into your workflow, connecting its `prompt` output to the model's text-prompt input.
2. Press **📂 Выбрать TXT...** and select any local `.txt` file.
3. Choose `Одна строка` (one line), `Пустая строка` (blank lines), or `Разделитель ---` (divider).
4. Set `seed=0` to start at the first prompt.
5. Press **▶ Генерировать весь TXT** to enqueue the entire collection.
6. Watch ComfyUI's queue. Each queued job contains a different prompt; one image or batch per job depends on the rest of your workflow.

Example with one prompt per line:

```text
fantasy witch in an enchanted forest, cinematic lighting
gothic vampire queen at an ancient castle, moonlight
warrior princess on a snowy mountain, dramatic lighting
```

### Notes

- The chosen file is copied to the ComfyUI server's `input/txt_prompt_picker/` directory under a generated ID. The source file is not continuously reread from your computer.
- A workflow JSON does **not** embed the original TXT; collaborators must load their own file.
- ComfyUI queues and processes jobs separately; the node's button is only responsible for creating the queue.

## Publishing

The repository includes a starter `pyproject.toml` and a manual GitHub Actions publishing workflow at `.github/workflows/publish.yml`.

**Before publishing:** set `[tool.comfy] PublisherId` to the publisher ID actually registered in Comfy Registry, and verify `[project.urls].Repository` matches this GitHub repository. To publish from GitHub Actions, create a repository secret named `REGISTRY_ACCESS_TOKEN` using a **Comfy Registry publisher API key**. Never commit the token to source control. Trigger the workflow manually via **Actions > Publish to Comfy Registry > Run workflow**.

## License

No license has been selected in this starter upload. The project owner should choose a license before wider distribution.
