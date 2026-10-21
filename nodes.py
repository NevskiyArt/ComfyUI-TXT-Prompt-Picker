from pathlib import Path
import folder_paths

ROOT = (Path(folder_paths.get_input_directory()) / "txt_prompt_picker").resolve()
MAX_BYTES = 10 * 1024 * 1024


def read_prompts(filename, split_mode):
    if not filename or filename == "(выбери TXT)":
        return []
    safe_name = Path(filename).name
    path = (ROOT / safe_name).resolve()
    if path.parent != ROOT or path.suffix.lower() != ".txt" or not path.is_file():
        raise ValueError("Файл не найден. Нажми кнопку «Выбрать TXT» в узле.")
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("TXT больше 10 МБ. Раздели его на несколько файлов.")
    # UTF-8 and Windows-1251 for common Russian text files.
    raw = path.read_bytes()
    encodings = ("utf-16", "utf-8-sig", "cp1251") if raw.startswith((b"\xff\xfe", b"\xfe\xff")) else ("utf-8-sig", "cp1251")
    for encoding in encodings:
        try:
            text = raw.decode(encoding)
            break
        except UnicodeError:
            continue
    else:
        raise ValueError("Не удалось прочитать кодировку файла.")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if split_mode == "Пустая строка":
        import re
        prompts = re.split(r"\n\s*\n+", text)
    elif split_mode == "Разделитель ---":
        import re
        prompts = re.split(r"(?m)^\s*---\s*$", text)
    else:
        prompts = text.split("\n")
    return [item.strip() for item in prompts if item.strip()]


class TxtPromptPicker:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "filename": ("STRING", {"default": "(выбери TXT)", "multiline": False}),
            "split_mode": (["Одна строка", "Пустая строка", "Разделитель ---"],),
            "seed": ("INT", {"default": 0, "min": 0, "max": 0xFFFFFFFFFFFFFFFF}),
        }}

    RETURN_TYPES = ("STRING", "INT", "INT")
    RETURN_NAMES = ("prompt", "номер (с 1)", "всего")
    FUNCTION = "next_prompt"
    CATEGORY = "TXT Prompts"
    DESCRIPTION = "Выбери TXT, затем нажми «Генерировать весь TXT» для постановки всех промптов в очередь."

    @classmethod
    def IS_CHANGED(cls, filename, split_mode, seed):
        # Respect index change AND file edits, without forcing an identical image rerun.
        if not filename or filename == "(выбери TXT)":
            return (filename, split_mode, seed)
        path = ROOT / Path(filename).name
        try:
            st = path.stat()
            return (filename, split_mode, seed, st.st_mtime_ns, st.st_size)
        except OSError:
            return (filename, split_mode, seed)

    def next_prompt(self, filename, split_mode, seed):
        prompts = read_prompts(filename, split_mode)
        if not prompts:
            raise ValueError("Нет промптов. Выбери TXT, проверь содержимое и способ разделения.")
        index = seed % len(prompts)
        return (prompts[index], index + 1, len(prompts))


NODE_CLASS_MAPPINGS = {"TxtPromptPicker": TxtPromptPicker}
NODE_DISPLAY_NAME_MAPPINGS = {"TxtPromptPicker": "📄 TXT → Промпты по очереди"}
