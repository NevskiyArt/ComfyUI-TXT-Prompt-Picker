# TXT Prompt Picker for ComfyUI

**By NevskiyArt** · Version **1.3.0** · [Read the Russian guide](README_RU.md)

A lightweight custom node that lets you select a local `.txt` file using a file-picker button and queue **all prompts for sequential image generation** in ComfyUI. No manual path entry, no extra Python packages.

## Features

- Select a TXT file from any folder using the file chooser in ComfyUI.
- Queue the whole prompt list with one click (one ComfyUI job per prompt).
- Stop the entire run with **⏹ Stop Entire Series**. This interrupts the current generation and clears the shared pending ComfyUI queue (including pending jobs from other workflows).
- Choose how prompts are separated: one nonempty line, blank lines, or `---` on its own line.
- Start from a specified zero-based `seed` index; prompts wrap around at the end.
- Text encodings: UTF-8 (including BOM), Windows-1251, and BOM-marked UTF-16.
- TXT size limit: 10 MiB.
- Standard `STRING` output works with FLUX, Qwen-Image, Z-Image and other string-prompt workflows.

## Installation

### From ComfyUI Manager

Once a version is **published and available** in [Comfy Registry](https://registry.comfy.org/), search for **TXT Prompt Picker by NevskiyArt** in ComfyUI Manager and install it. A GitHub repository alone does not list an extension in Registry.

### Manually (available immediately)

1. On this GitHub repository select **Code → Download ZIP**.
2. Extract the repository folder under the **custom nodes directory of the ComfyUI installation you actually use**. The structure must look like:

   ```text
   ComfyUI/
   └── custom_nodes/
       └── ComfyUI-TXT-Prompt-Picker/
           ├── __init__.py
           ├── nodes.py
           ├── routes.py
           └── web/
               └── picker.js
   ```

3. Restart ComfyUI. Refresh its page with **Ctrl+F5** if the buttons do not appear.
4. Add the node **TXT Prompt Picker** from category **TXT Prompts** (the node and button labels are in English).

## Usage

1. Connect the node's `prompt` output to a string prompt input of your image-generation workflow.
2. Click the **folder / choose TXT** button; select any local `.txt` file.
3. Choose a splitting method using the dropdown: **one line**, **blank line**, or **triple-dash divider**.
4. Set `seed` to `0` if you want to start at the first prompt.
5. Click the **generate entire TXT** button. The extension adds one job for each prompt to ComfyUI's queue.
6. Let ComfyUI process the jobs. To generate multiple images for a single prompt, configure that in the underlying workflow.

**Note:** Version 1.3 uses English labels and accepts old Russian option values from existing workflows.

### Example: one prompt per line

```text
beautiful fantasy witch, enchanted forest, cinematic lighting
gothic vampire queen, moonlit castle
fantasy knight, snow-covered mountain, dramatic lighting
```

### Example: multi-line prompts separated by `---`

```text
A portrait of a fantasy witch.
Dramatic rim light, detailed clothing.
---
An old gothic castle.
A full moon above the rooftops.
```

## Important notes

- The selected TXT is **uploaded to the ComfyUI server** under `input/txt_prompt_picker/` with a generated filename; the extension does not permanently watch the original file on your computer. Re-select it after editing.
- Exported workflow JSON files store the uploaded filename, **not the source TXT text**. Other users must pick/upload their own TXT file.
- Running the full-TXT button queues jobs; generation still depends on ComfyUI and the other nodes in your workflow.
- This extension has been used successfully in ComfyUI Desktop; compatibility with every ComfyUI/Manager build has not been independently verified.

## For maintainers: publishing to Comfy Registry

See [PUBLISHING_RU.md](PUBLISHING_RU.md). This repository contains `.github/workflows/publish.yml` for manual publishing. Register the publisher first, check `PublisherId` in `pyproject.toml`, and add the publisher's Registry API key as the GitHub Actions secret `REGISTRY_ACCESS_TOKEN`. **Never put API keys into code or docs.**

## License

[MIT](LICENSE) · Copyright (c) 2026 NevskiyArt


## Stop a batch

Click **⏹ Stop Entire Series** inside TXT Prompt Picker. This stops submitting further prompts, requests an interrupt of the current generation, and clears pending jobs in ComfyUI's queue. **Warning:** clearing the queue also discards pending jobs from other workflows, not only this TXT batch. Files already saved are not deleted.

The normal ComfyUI Stop control might interrupt only the current job; use the node's own button for the full batch.
