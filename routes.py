import uuid
from pathlib import Path
from aiohttp import web
from server import PromptServer
from .nodes import ROOT, MAX_BYTES, read_prompts


@PromptServer.instance.routes.post("/txt_prompt_picker/upload")
async def upload_txt(request):
    try:
        form = await request.post()
        file = form.get("file")
        if file is None or not hasattr(file, "file"):
            return web.json_response({"error": "Файл не выбран"}, status=400)
        original = Path(file.filename or "").name
        if not original.lower().endswith(".txt"):
            return web.json_response({"error": "Нужен файл формата .txt"}, status=400)
        data = file.file.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            return web.json_response({"error": "Максимальный размер TXT — 10 МБ"}, status=413)
        ROOT.mkdir(parents=True, exist_ok=True)
        # Do not trust user-supplied filenames or allow directory traversal.
        name = f"{uuid.uuid4().hex}.txt"
        destination = ROOT / name
        destination.write_bytes(data)
        # Encoding will be validated on generation; return file count for convenience.
        try:
            count_lines = len(read_prompts(name, "Одна строка"))
        except Exception:
            count_lines = None
        return web.json_response({"filename": name, "original": original, "line_count": count_lines})
    except Exception as exc:
        return web.json_response({"error": str(exc)}, status=500)


@PromptServer.instance.routes.get("/txt_prompt_picker/info")
async def txt_info(request):
    try:
        filename = request.query.get("filename", "")
        split_mode = request.query.get("split_mode", "Одна строка")
        prompts = read_prompts(filename, split_mode)
        return web.json_response({"count": len(prompts)})
    except Exception as exc:
        return web.json_response({"error": str(exc)}, status=400)
